import { recordAudit } from "../../shared/audit/audit.js";
import type { ActorContext, Principal } from "../../shared/auth/principal.js";
import { database } from "../../shared/database/database.js";
import {
  notFoundProblem,
  ProblemError,
  validationProblem,
  versionConflictProblem,
} from "../../shared/errors/problem-error.js";
import { readBlob, storagePath } from "../../shared/storage/blob-storage.js";
import { rubberSheetImage, type RubberSheet } from "./atak/rubber-sheet.js";
import { readTile, tileCacheSummary, type Tile } from "./atak/tile-cache.js";
import { requireDataPackage, requireEditableEvent } from "./data-package-access.js";
import { removeUnreferencedBlobs } from "./package-content-cleanup.js";
import type { PackageContentDto, UpdatePackageContentRequest } from "./package-content.dto.js";

function rubberSheetOf(metadata: unknown): RubberSheet | null {
  return (metadata as { rubberSheet?: RubberSheet } | null)?.rubberSheet ?? null;
}

/** The draft's map content, oldest first. Requires `data-packages.read`. */
export async function listPackageContents(
  principal: Principal,
  eventId: string,
  packageId: string,
): Promise<PackageContentDto[]> {
  await requireDataPackage(principal, eventId, packageId, "data-packages.read");
  const contents = await database.packageContent.findMany({
    where: { packageId },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    include: { blob: { select: { size: true, storageKey: true } } },
  });
  return contents.map((content) => {
    const sheet = rubberSheetOf(content.metadata);
    return {
      id: content.id,
      layerId: content.layerId,
      kind: content.kind as PackageContentDto["kind"],
      name: content.name,
      size: content.blob.size,
      rubberSheet: sheet === null ? null : { corners: sheet.corners, imageMediaType: sheet.imageMediaType },
      offlineMap: isTileCache(content.kind)
        ? tileCacheSummary(content.blobId, storagePath(content.blob.storageKey), content.kind === "nested-data-package")
        : null,
      visible: content.visible,
      opacity: content.opacity,
      version: content.version,
    };
  });
}

function isTileCache(kind: string): boolean {
  return kind === "offline-map" || kind === "nested-data-package";
}

/** One tile of an offline map, read from the stored cache; never the file itself. */
export async function offlineMapTile(
  principal: Principal,
  eventId: string,
  packageId: string,
  contentId: string,
  tile: { z: number; x: number; y: number },
): Promise<Tile> {
  await requireDataPackage(principal, eventId, packageId, "data-packages.read");
  const content = await database.packageContent.findFirst({ where: { id: contentId, packageId }, include: { blob: true } });
  const size = 2 ** tile.z;
  const found =
    content === null || !isTileCache(content.kind) || tile.x >= size || tile.y >= size
      ? null
      : readTile(content.blobId, storagePath(content.blob.storageKey), content.kind === "nested-data-package", tile.z, tile.x, tile.y);
  if (found === null) {
    throw notFoundProblem();
  }
  return found;
}

/**
 * The image of a rubber sheet, read from its stored KMZ for display. The stored file is never
 * exposed directly; only this checked image leaves the server.
 */
export async function rubberSheetImageOf(
  principal: Principal,
  eventId: string,
  packageId: string,
  contentId: string,
): Promise<{ bytes: Uint8Array; mediaType: string }> {
  await requireDataPackage(principal, eventId, packageId, "data-packages.read");
  const content = await database.packageContent.findFirst({
    where: { id: contentId, packageId, kind: "rubber-sheet" },
    include: { blob: true },
  });
  const sheet = rubberSheetOf(content?.metadata ?? null);
  if (content === null || sheet === null) {
    throw notFoundProblem();
  }
  const image = rubberSheetImage(await readBlob(content.blob.storageKey), sheet.imagePath);
  if (image === null) {
    throw notFoundProblem();
  }
  return { bytes: image, mediaType: sheet.imageMediaType };
}

async function findEditableContent(actor: ActorContext, eventId: string, packageId: string, contentId: string) {
  const { event } = await requireDataPackage(actor.principal, eventId, packageId, "data-packages.edit");
  requireEditableEvent(event);
  const content = await database.packageContent.findFirst({ where: { id: contentId, packageId }, include: { layer: true } });
  if (content === null) {
    throw notFoundProblem();
  }
  return content;
}

function lockedLayerProblem(): ProblemError {
  return new ProblemError({
    type: "urn:openmeshtak:problem:layer-locked",
    title: "Layer is locked",
    status: 409,
    detail: "Unlock the layer before renaming, moving or removing its map content.",
    code: "LAYER_LOCKED",
  });
}

/**
 * Renames, moves or restyles map content in the draft. Visibility and opacity are display
 * settings and stay editable in locked layers; renaming and moving are not.
 */
export async function updatePackageContent(
  actor: ActorContext,
  eventId: string,
  packageId: string,
  contentId: string,
  input: UpdatePackageContentRequest,
): Promise<PackageContentDto> {
  const content = await findEditableContent(actor, eventId, packageId, contentId);
  if (content.version !== input.version) {
    throw versionConflictProblem(content.version);
  }
  const structural = input.name !== content.name || input.layerId !== content.layerId;
  if (structural) {
    const target = await database.packageLayer.findFirst({ where: { id: input.layerId, packageId } });
    if (target === null) {
      throw validationProblem([{ field: "layerId", code: "UNKNOWN_LAYER", message: "Choose a layer of this data package." }]);
    }
    if (content.layer.locked || target.locked) {
      throw lockedLayerProblem();
    }
  }

  const updated = await database.packageContent.updateMany({
    where: { id: contentId, version: input.version },
    data: { name: input.name, layerId: input.layerId, visible: input.visible, opacity: input.opacity, version: { increment: 1 } },
  });
  if (updated.count !== 1) {
    const latest = await database.packageContent.findUnique({ where: { id: contentId } });
    throw latest === null ? notFoundProblem() : versionConflictProblem(latest.version);
  }
  const contents = await listPackageContents(actor.principal, eventId, packageId);
  return contents.find(({ id }) => id === contentId)!;
}

/** Removes map content from the draft; its stored file goes once nothing uses it any more. */
export async function deletePackageContent(
  actor: ActorContext,
  eventId: string,
  packageId: string,
  contentId: string,
): Promise<void> {
  const content = await findEditableContent(actor, eventId, packageId, contentId);
  if (content.layer.locked) {
    throw lockedLayerProblem();
  }
  await database.$transaction(async (transaction) => {
    await transaction.packageContent.delete({ where: { id: contentId } });
    await recordAudit(
      {
        actor: actor.principal,
        action: "data-package.content-deleted",
        targetType: "data-package",
        targetId: packageId,
        result: "success",
        traceId: actor.traceId,
        metadata: { eventId, contentId, kind: content.kind },
      },
      transaction,
    );
  });
  await removeUnreferencedBlobs(eventId, [content.blobId]);
}
