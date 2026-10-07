import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { z } from "zod";
import { config } from "../../shared/config/config.js";
import { logger } from "../../shared/logging/logger.js";
import { compareFirmwareVersions, parseFirmwareVersion, type FirmwareVersion } from "./firmware-version.js";

/** The list flasher.meshtastic.org itself shows; served through a CDN cache. */
export const FLASHER_RELEASES_URL = "https://api.meshtastic.org/github/firmware/list";

/** A downloaded list counts as current for this long; afterwards it is refreshed. */
export const RELEASES_VALID_MS = 12 * 60 * 60 * 1000;
/** After a failed lookup, wait before trying again so offline installations do not stall requests. */
const RETRY_AFTER_MS = 15 * 60 * 1000;
const TIMEOUT_MS = 5000;
const MAX_RESPONSE_BYTES = 2 * 1024 * 1024;

/** The last successful list survives restarts, which matters for installations that run offline. */
const DEFAULT_CACHE_FILE = resolve(config.dataDirectory, "cache", "meshtastic-firmware-releases.json");

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

type Fetcher = typeof fetch;

const releaseEntrySchema = z.object({ id: z.string().max(100), title: z.string().max(300) });
const releaseBucketsSchema = z.object({
  stable: z.array(releaseEntrySchema).max(1000).default([]),
  alpha: z.array(releaseEntrySchema).max(1000).default([]),
});
type ReleaseBuckets = z.infer<typeof releaseBucketsSchema>;

const flasherListSchema = z.object({ releases: releaseBucketsSchema });
const cacheFileSchema = z.object({ fetchedAt: z.iso.datetime(), releases: releaseBucketsSchema });

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
function toReleases(buckets: ReleaseBuckets): PublishedFirmwareRelease[] {
  const unique = new Map<string, PublishedFirmwareRelease>();
  for (const [bucket, entries] of [["stable", buckets.stable], ["alpha", buckets.alpha]] as const) {
    for (const entry of entries) {
      const release = toRelease(entry, bucket);
      if (release !== null && !unique.has(entry.id)) {
        unique.set(entry.id, release);
      }
    }
  }
  return [...unique.values()].sort((left, right) => compareFirmwareVersions(right.version, left.version));
}

export function parseFlasherReleases(body: unknown): PublishedFirmwareRelease[] {
  return toReleases(flasherListSchema.parse(body).releases);
}

/**
 * Published firmware releases, looked up lazily. The last successful list is kept in memory and
 * in a cache file; a failed lookup keeps it, and without one the list is unknown.
 */
export class FirmwareReleaseFeed {
  private snapshot: ReleaseSnapshot | null = null;
  private cacheRead = false;
  private lastFailureAt: number | null = null;
  private pending: Promise<void> | undefined;

  /** `cacheFile: null` keeps the list in memory only. */
  constructor(
    private readonly fetcher: Fetcher = fetch,
    private readonly now: () => number = Date.now,
    private readonly cacheFile: string | null = DEFAULT_CACHE_FILE,
  ) {}

  async current(): Promise<ReleaseSnapshot | null> {
    if (!this.cacheRead) {
      this.cacheRead = true;
      this.snapshot = await this.readCache();
    }
    if (this.shouldLookUp()) {
      const lookup = this.lookUp();
      // With a list in hand, refresh in the background instead of delaying the request.
      if (this.snapshot === null) {
        await lookup;
      }
    }
    return this.snapshot;
  }

  /** Whether a list is still within its validity period. */
  isFresh(snapshot: ReleaseSnapshot): boolean {
    return this.now() - snapshot.fetchedAt.getTime() < RELEASES_VALID_MS;
  }

  private shouldLookUp(): boolean {
    if (this.pending !== undefined) {
      return false;
    }
    if (this.lastFailureAt !== null && this.now() - this.lastFailureAt < RETRY_AFTER_MS) {
      return false;
    }
    return this.snapshot === null || !this.isFresh(this.snapshot);
  }

  private lookUp(): Promise<void> {
    this.pending = this.download()
      .then(async (buckets) => {
        const fetchedAt = new Date(this.now());
        this.snapshot = { releases: toReleases(buckets), fetchedAt };
        this.lastFailureAt = null;
        await this.writeCache(buckets, fetchedAt);
      })
      .catch((error: unknown) => {
        this.lastFailureAt = this.now();
        logger.warn({ error, event: "firmware_release_lookup_failed" }, "Meshtastic firmware release lookup failed");
      })
      .finally(() => {
        this.pending = undefined;
      });
    return this.pending;
  }

  private async download(): Promise<ReleaseBuckets> {
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
    return flasherListSchema.parse(JSON.parse(text)).releases;
  }

  /** A missing or damaged cache file just means no list yet. */
  private async readCache(): Promise<ReleaseSnapshot | null> {
    if (this.cacheFile === null) {
      return null;
    }
    try {
      const cached = cacheFileSchema.parse(JSON.parse(await readFile(this.cacheFile, "utf8")));
      return { releases: toReleases(cached.releases), fetchedAt: new Date(cached.fetchedAt) };
    } catch {
      return null;
    }
  }

  /**
   * Stores only tags and titles (the schema strips everything else), written to a temporary file
   * first so a crash never leaves half a file.
   */
  private async writeCache(buckets: ReleaseBuckets, fetchedAt: Date): Promise<void> {
    if (this.cacheFile === null) {
      return;
    }
    try {
      const content = JSON.stringify({ fetchedAt: fetchedAt.toISOString(), releases: buckets });
      await mkdir(dirname(this.cacheFile), { recursive: true });
      await writeFile(`${this.cacheFile}.tmp`, content, "utf8");
      await rename(`${this.cacheFile}.tmp`, this.cacheFile);
    } catch (error: unknown) {
      logger.warn({ error, event: "firmware_release_cache_write_failed" }, "Meshtastic firmware release list could not be cached");
    }
  }
}
