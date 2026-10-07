import { z } from "zod";
import { logger } from "../../shared/logging/logger.js";
import { compareFirmwareVersions, parseFirmwareVersion, type FirmwareVersion } from "./firmware-version.js";

/** The list flasher.meshtastic.org itself shows; served through a CDN cache. */
export const FLASHER_RELEASES_URL = "https://api.meshtastic.org/github/firmware/list";

const REFRESH_AFTER_MS = 6 * 60 * 60 * 1000;
/** After a failed lookup, wait before trying again so offline installations do not stall requests. */
const RETRY_AFTER_MS = 15 * 60 * 1000;
const TIMEOUT_MS = 5000;
const MAX_RESPONSE_BYTES = 2 * 1024 * 1024;

export type ReleaseChannel = "stable" | "beta" | "alpha";

export interface PublishedFirmwareRelease {
  version: FirmwareVersion;
  /** Short commit hash of the build, e.g. `8e6a88d`. */
  build: string;
  channel: ReleaseChannel;
}

export interface ReleaseSnapshot {
  releases: PublishedFirmwareRelease[];
  fetchedAt: Date;
}

export interface ReleaseFeedState {
  snapshot: ReleaseSnapshot | null;
  /** The latest lookup failed; `snapshot` is then the last successful one. */
  lastLookupFailed: boolean;
}

type Fetcher = typeof fetch;

const flasherListSchema = z.object({
  releases: z.object({
    stable: z.array(z.object({ id: z.string(), title: z.string() })).default([]),
    alpha: z.array(z.object({ id: z.string(), title: z.string() })).default([]),
  }),
});

/** Release tags look like `v2.8.1.8e6a88d`. */
const TAG_PATTERN = /^v(\d{1,4}\.\d{1,4}\.\d{1,5})\.([0-9a-f]{7,40})$/;

/**
 * The flasher's `stable` bucket holds releases titled `Beta`, so the channel comes from the title
 * and the bucket is only the fallback. Revoked builds stay listed upstream but are never offered.
 */
function toRelease(entry: { id: string; title: string }, bucket: "stable" | "alpha"): PublishedFirmwareRelease | null {
  const match = TAG_PATTERN.exec(entry.id);
  const version = match === null ? null : parseFirmwareVersion(match[1] ?? "");
  if (match === null || version === null || /revoked/i.test(entry.title)) {
    return null;
  }
  const channel: ReleaseChannel = /\balpha\b/i.test(entry.title)
    ? "alpha"
    : /\bbeta\b/i.test(entry.title)
      ? "beta"
      : /\bstable\b/i.test(entry.title)
        ? "stable"
        : bucket;
  return { version, build: match[2] ?? "", channel };
}

/** Full releases only, newest first. Pull-request builds are a separate upstream list and ignored. */
export function parseFlasherReleases(body: unknown): PublishedFirmwareRelease[] {
  const { releases } = flasherListSchema.parse(body);
  const unique = new Map<string, PublishedFirmwareRelease>();
  for (const [bucket, entries] of [["stable", releases.stable], ["alpha", releases.alpha]] as const) {
    for (const entry of entries) {
      const release = toRelease(entry, bucket);
      if (release !== null && !unique.has(entry.id)) {
        unique.set(entry.id, release);
      }
    }
  }
  return [...unique.values()].sort((left, right) => compareFirmwareVersions(right.version, left.version));
}

/**
 * Published firmware releases, looked up lazily and kept in memory. A failed lookup keeps the last
 * successful list; without one, the list is unknown. Nothing is persisted.
 */
export class FirmwareReleaseFeed {
  private snapshot: ReleaseSnapshot | null = null;
  private lastAttemptAt: number | null = null;
  private lastLookupFailed = false;
  private pending: Promise<void> | undefined;

  constructor(
    private readonly fetcher: Fetcher = fetch,
    private readonly now: () => number = Date.now,
  ) {}

  async state(): Promise<ReleaseFeedState> {
    if (this.shouldLookUp()) {
      const lookup = this.lookUp();
      // With a list in hand, refresh in the background instead of delaying the request.
      if (this.snapshot === null) {
        await lookup;
      }
    }
    return { snapshot: this.snapshot, lastLookupFailed: this.lastLookupFailed };
  }

  private shouldLookUp(): boolean {
    if (this.pending !== undefined) {
      return false;
    }
    if (this.lastAttemptAt === null) {
      return true;
    }
    const waited = this.now() - this.lastAttemptAt;
    return this.lastLookupFailed ? waited >= RETRY_AFTER_MS : waited >= REFRESH_AFTER_MS;
  }

  private lookUp(): Promise<void> {
    this.lastAttemptAt = this.now();
    this.pending = this.download()
      .then((releases) => {
        this.snapshot = { releases, fetchedAt: new Date(this.now()) };
        this.lastLookupFailed = false;
      })
      .catch((error: unknown) => {
        this.lastLookupFailed = true;
        logger.warn({ error, event: "firmware_release_lookup_failed" }, "Meshtastic firmware release lookup failed");
      })
      .finally(() => {
        this.pending = undefined;
      });
    return this.pending;
  }

  private async download(): Promise<PublishedFirmwareRelease[]> {
    const response = await this.fetcher(FLASHER_RELEASES_URL, {
      headers: { accept: "application/json" },
      redirect: "error",
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!response.ok) {
      throw new Error(`HTTP ${String(response.status)}`);
    }
    const declaredLength = Number(response.headers.get("content-length") ?? 0);
    if (declaredLength > MAX_RESPONSE_BYTES) {
      throw new Error("response too large");
    }
    const text = await response.text();
    if (text.length > MAX_RESPONSE_BYTES) {
      throw new Error("response too large");
    }
    return parseFlasherReleases(JSON.parse(text));
  }
}
