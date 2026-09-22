import { database } from "../../shared/database/database.js";
import { logger } from "../../shared/logging/logger.js";
import { removeBlob } from "../../shared/storage/blob-storage.js";
import { forgetTileCache } from "./atak/tile-cache.js";
import type { PackageSnapshot } from "./package-snapshot.js";

function snapshotBlobIds(snapshot: unknown): string[] {
  return ((snapshot as PackageSnapshot).contents ?? []).map(({ blobId }) => blobId);
}

/**
 * Stored files a package or layer refers to, collected before it is deleted: its draft content
 * and every published revision. Pass `layerId` to limit the draft part to one layer.
 */
export async function referencedBlobIds(packageId: string, layerId?: string): Promise<string[]> {
  const [contents, revisions] = await Promise.all([
    database.packageContent.findMany({ where: { packageId, ...(layerId === undefined ? {} : { layerId }) }, select: { blobId: true } }),
    layerId === undefined ? database.packageRevision.findMany({ where: { packageId }, select: { snapshot: true } }) : Promise.resolve([]),
  ]);
  return [...new Set([...contents.map(({ blobId }) => blobId), ...revisions.flatMap(({ snapshot }) => snapshotBlobIds(snapshot))])];
}

/**
 * Deletes stored files nothing refers to any more. Copies share files with their source, so a
 * file stays while any draft content or any published revision in the event still uses it.
 * The database row goes first; a file left behind by a failed removal is logged, never served.
 */
export async function removeUnreferencedBlobs(eventId: string, blobIds: readonly string[]): Promise<void> {
  if (blobIds.length === 0) {
    return;
  }
  const [contents, revisions] = await Promise.all([
    database.packageContent.findMany({ where: { blobId: { in: [...blobIds] } }, select: { blobId: true } }),
    database.packageRevision.findMany({ where: { dataPackage: { eventId } }, select: { snapshot: true } }),
  ]);
  const inUse = new Set([...contents.map(({ blobId }) => blobId), ...revisions.flatMap(({ snapshot }) => snapshotBlobIds(snapshot))]);

  for (const blobId of blobIds.filter((id) => !inUse.has(id))) {
    const blob = await database.storageBlob.delete({ where: { id: blobId } }).catch(() => null);
    if (blob === null) {
      continue;
    }
    try {
      // An open SQLite handle would keep the file locked on Windows.
      forgetTileCache(blob.id);
      await removeBlob(blob.storageKey);
    } catch (error: unknown) {
      logger.warn({ error, event: "storage_blob_remove_failed", blobId }, "Stored file could not be removed");
    }
  }
}
