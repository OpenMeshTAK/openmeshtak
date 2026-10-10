import { createHash } from "node:crypto";
import { z } from "zod";
import type { Event, PackageRevision } from "../../generated/prisma/client.js";
import { recordAudit } from "../../shared/audit/audit.js";
import type { ActorContext, Principal } from "../../shared/auth/principal.js";
import { database } from "../../shared/database/database.js";
import { notFoundProblem, ProblemError, validationProblem } from "../../shared/errors/problem-error.js";
import { readBlob, storagePath } from "../../shared/storage/blob-storage.js";
import { requireEventPermission } from "../events/event-access.js";
import { requireDataPackage } from "../data-packages/data-package-access.js";
import { rubberSheetImage, type RubberSheet } from "../data-packages/atak/rubber-sheet.js";
import { listTiles, tileCacheSummary } from "../data-packages/atak/tile-cache.js";
import type { PackageSnapshot, PackageSnapshotContent } from "../data-packages/package-snapshot.js";
import type {
  CreateOfflineSnapshotRequest,
  OfflineContentDto,
  OfflineSkippedContentDto,
  OfflineSnapshotDto,
  OfflineSnapshotPackageDto,
  OfflineTilePage,
} from "./offline-snapshot.dto.js";

/** Version of the offline snapshot document; the Web app refuses unknown formats. */
export const OFFLINE_SNAPSHOT_FORMAT = 1;
export const DEFAULT_TILE_PAGE = 50;

function eventNotActiveProblem(): ProblemError {
  return new ProblemError({
    type: "urn:openmeshtak:problem:event-not-active",
    title: "Event is not active",
    status: 409,
    detail: "Only active events can be made available offline.",
    code: "EVENT_NOT_ACTIVE",
  });
}

/**
 * The offline HQ view only works with content the event already shares: published revisions of
 * its Data Packages and missions. It needs `offline-snapshots.prepare` plus read access to each
 * selected kind (`data-packages.read` or `missions.read`), and only works while the event is active.
 */
async function requireOfflineEvent(principal: Principal, eventId: string): Promise<Event> {
  const event = await requireEventPermission(principal, eventId, "offline-snapshots.prepare");
  if (event.status !== "active") {
    throw eventNotActiveProblem();
  }
  return event;
}

function isTileCache(kind: string): boolean {
  return kind === "offline-map" || kind === "nested-data-package";
}

function rubberSheetOf(content: PackageSnapshotContent): RubberSheet | null {
  return (content.metadata as { rubberSheet?: RubberSheet } | undefined)?.rubberSheet ?? null;
}

async function storedBlob(content: PackageSnapshotContent) {
  const blob = await database.storageBlob.findUnique({ where: { id: content.blobId } });
  // Blobs are content-addressed; a mismatch means the stored file is not what was published.
  return blob !== null && blob.sha256 === content.sha256 && blob.size === content.size ? blob : null;
}

type ContentResult = { shown: OfflineContentDto } | { skipped: OfflineSkippedContentDto };

async function offlineContent(content: PackageSnapshotContent): Promise<ContentResult> {
  const skipped = (reason: OfflineSkippedContentDto["reason"]): ContentResult => ({
    skipped: { id: content.id, name: content.name, kind: content.kind, reason },
  });
  if (isTileCache(content.kind)) {
    const blob = await storedBlob(content);
    const summary = blob === null ? null : tileCacheSummary(blob.id, storagePath(blob.storageKey), content.kind === "nested-data-package");
    if (summary === null) {
      return skipped("unreadable");
    }
    return {
      shown: {
        id: content.id,
        layerId: content.layerId,
        kind: "tiles",
        name: content.name,
        minZoom: summary.minZoom,
        maxZoom: summary.maxZoom,
        bounds: summary.bounds,
        tiles: summary.tiles,
        size: content.size,
      },
    };
  }
  const sheet = content.kind === "rubber-sheet" ? rubberSheetOf(content) : null;
  if (sheet === null) {
    return skipped("not-displayable");
  }
  const blob = await storedBlob(content);
  const image = blob === null ? null : rubberSheetImage(await readBlob(blob.storageKey), sheet.imagePath);
  if (image === null) {
    return skipped("unreadable");
  }
  return {
    shown: {
      id: content.id,
      layerId: content.layerId,
      kind: "image",
      name: content.name,
      corners: sheet.corners,
      mediaType: sheet.imageMediaType,
      sha256: createHash("sha256").update(image).digest("hex"),
      size: image.length,
    },
  };
}

async function findRevision(packageId: string, number: number | undefined): Promise<PackageRevision | null> {
  return number === undefined
    ? database.packageRevision.findFirst({ where: { packageId }, orderBy: { number: "desc" } })
    : database.packageRevision.findUnique({ where: { packageId_number: { packageId, number } } });
}

async function snapshotPackage(
  dataPackage: { id: string; kind: string; name: string },
  revision: PackageRevision,
): Promise<OfflineSnapshotPackageDto> {
  const snapshot = revision.snapshot as unknown as PackageSnapshot;
  const results = await Promise.all((snapshot.contents ?? []).map(offlineContent));
  return {
    packageId: dataPackage.id,
    kind: dataPackage.kind === "mission" ? "mission" : "package",
    name: dataPackage.name,
    revision: revision.number,
    revisionId: revision.id,
    snapshotHash: revision.snapshotHash,
    publishedAt: revision.createdAt.toISOString(),
    layers: snapshot.layers,
    objects: snapshot.objects,
    contents: results.flatMap((result) => ("shown" in result ? [result.shown] : [])),
    skippedContents: results.flatMap((result) => ("skipped" in result ? [result.skipped] : [])),
  };
}

/**
 * Builds the offline snapshot document for the selected packages. Nothing is stored on the
 * server; the call is audited because private event content is about to leave for a browser.
 */
export async function createOfflineSnapshot(
  actor: ActorContext,
  eventId: string,
  input: CreateOfflineSnapshotRequest,
): Promise<OfflineSnapshotDto> {
  const event = await requireOfflineEvent(actor.principal, eventId);
  const ids = input.packages.map(({ packageId }) => packageId);
  if (new Set(ids).size !== ids.length) {
    throw validationProblem([{ field: "packages", code: "DUPLICATE", message: "Select each data package only once." }]);
  }

  const packages: OfflineSnapshotPackageDto[] = [];
  const skippedPackages: OfflineSnapshotDto["skippedPackages"] = [];
  for (const selection of input.packages) {
    const { dataPackage } = await requireDataPackage(actor.principal, eventId, selection.packageId, "data-packages.read");
    const revision = await findRevision(dataPackage.id, selection.revision);
    if (revision === null) {
      if (selection.revision !== undefined) {
        throw notFoundProblem();
      }
      skippedPackages.push({ packageId: dataPackage.id, name: dataPackage.name, reason: "not-published" });
      continue;
    }
    packages.push(await snapshotPackage(dataPackage, revision));
  }

  await recordAudit({
    actor: actor.principal,
    action: "event.offline-snapshot-prepared",
    targetType: "event",
    targetId: eventId,
    result: "success",
    traceId: actor.traceId,
    metadata: { revisions: packages.map(({ packageId, revision }) => ({ packageId, revision })) },
  });

  return {
    format: OFFLINE_SNAPSHOT_FORMAT,
    event: { id: event.id, name: event.name, timeZone: event.timeZone },
    preparedAt: new Date().toISOString(),
    packages,
    skippedPackages,
    estimatedBytes: packages.flatMap(({ contents }) => contents).reduce((total, { size }) => total + size, 0),
  };
}

/** Finds displayable content of a published revision after the same checks as the snapshot. */
async function requireRevisionContent(
  principal: Principal,
  eventId: string,
  packageId: string,
  revisionNumber: number,
  contentId: string,
): Promise<PackageSnapshotContent> {
  await requireOfflineEvent(principal, eventId);
  await requireDataPackage(principal, eventId, packageId, "data-packages.read");
  const revision = await findRevision(packageId, revisionNumber);
  const content = (revision?.snapshot as unknown as PackageSnapshot | undefined)?.contents?.find(({ id }) => id === contentId);
  if (content === undefined) {
    throw notFoundProblem();
  }
  return content;
}

const tileCursorSchema = z.object({ c: z.string(), k: z.number().int().nonnegative() });

function invalidCursor(): ProblemError {
  return new ProblemError({
    type: "urn:openmeshtak:problem:invalid-cursor",
    title: "Invalid cursor",
    status: 400,
    detail: "The pagination cursor is malformed or belongs to a different list.",
    code: "INVALID_CURSOR",
  });
}

/** Tile cursors carry the last packed tile key instead of a creation time. */
function decodeTileCursor(context: string, cursor: string | undefined): number {
  if (cursor === undefined) {
    return -1;
  }
  let payload: unknown;
  try {
    payload = JSON.parse(Buffer.from(cursor, "base64url").toString("utf8"));
  } catch {
    throw invalidCursor();
  }
  const parsed = tileCursorSchema.safeParse(payload);
  if (!parsed.success || parsed.data.c !== context) {
    throw invalidCursor();
  }
  return parsed.data.k;
}

function encodeTileCursor(context: string, key: number): string {
  return Buffer.from(JSON.stringify({ c: context, k: key }), "utf8").toString("base64url");
}

/** One page of a published tile cache, in ascending tile order. */
export async function offlineTilePage(
  principal: Principal,
  eventId: string,
  packageId: string,
  revisionNumber: number,
  contentId: string,
  limit = DEFAULT_TILE_PAGE,
  cursor?: string,
): Promise<OfflineTilePage> {
  const content = await requireRevisionContent(principal, eventId, packageId, revisionNumber, contentId);
  const context = `offline-tiles:${packageId}:${String(revisionNumber)}:${contentId}`;
  const afterKey = decodeTileCursor(context, cursor);
  const blob = isTileCache(content.kind) ? await storedBlob(content) : null;
  const listed = blob === null
    ? null
    : listTiles(blob.id, storagePath(blob.storageKey), content.kind === "nested-data-package", afterKey, limit);
  if (listed === null) {
    throw notFoundProblem();
  }
  return {
    items: listed.tiles.map(({ z: zoom, x, y, mediaType, bytes }) => ({
      z: zoom,
      x,
      y,
      mediaType,
      data: Buffer.from(bytes).toString("base64"),
      sha256: createHash("sha256").update(bytes).digest("hex"),
    })),
    page: {
      hasMore: listed.hasMore,
      nextCursor: listed.hasMore && listed.lastKey !== null ? encodeTileCursor(context, listed.lastKey) : null,
    },
  };
}

/** The image of a published rubber sheet. */
export async function offlineImage(
  principal: Principal,
  eventId: string,
  packageId: string,
  revisionNumber: number,
  contentId: string,
): Promise<{ bytes: Uint8Array; mediaType: string }> {
  const content = await requireRevisionContent(principal, eventId, packageId, revisionNumber, contentId);
  const sheet = content.kind === "rubber-sheet" ? rubberSheetOf(content) : null;
  const blob = sheet === null ? null : await storedBlob(content);
  const image = sheet === null || blob === null ? null : rubberSheetImage(await readBlob(blob.storageKey), sheet.imagePath);
  if (sheet === null || image === null) {
    throw notFoundProblem();
  }
  return { bytes: image, mediaType: sheet.imageMediaType };
}
