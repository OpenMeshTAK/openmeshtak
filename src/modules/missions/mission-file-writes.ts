import { randomUUID } from "node:crypto";
import { database } from "../../shared/database/database.js";
import { removeBlob, writeBlob } from "../../shared/storage/blob-storage.js";
import { removeUnreferencedBlobs } from "../data-packages/package-content-cleanup.js";
import { announceRevisionCreated } from "../data-packages/package-revision-events.js";
import type { PackageSnapshot, PackageSnapshotContent } from "../data-packages/package-snapshot.js";
import { eventChanges } from "../events/event-changes.js";
import type { VisibleMission } from "./mission-access.js";
import { saveTakRevision, takLayerId, type MissionAuthor, type MissionWriteResult } from "./mission-writes.js";
import type { UploadedFile } from "./tak-uploads.js";

/** Files added from TAK apps; the editor lists them and exports them unchanged. */
export const MISSION_FILE_KIND = "file";
const MAX_FILES_PER_MISSION = 200;

/**
 * Media types are only metadata for TAK apps: the declared type of an upload is never trusted, and
 * files are always served as downloads, never inline.
 */
const MEDIA_TYPES: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  pdf: "application/pdf",
  txt: "text/plain",
  zip: "application/zip",
  kml: "application/vnd.google-earth.kml+xml",
  kmz: "application/vnd.google-earth.kmz",
};

export function mediaTypeOf(fileName: string): string {
  const extension = /\.([a-z0-9]+)$/i.exec(fileName)?.[1]?.toLowerCase() ?? "";
  return MEDIA_TYPES[extension] ?? "application/octet-stream";
}

function announce(found: VisibleMission): void {
  // The editor reloads layers and contents; a new "From TAK apps" layer may have been created.
  const base = `data-packages/${found.mission.id}`;
  eventChanges.emit("changed", { eventId: found.mission.eventId, path: `${base}/mission-files`, method: "PUT", createdId: null, tabId: null });
  eventChanges.emit("changed", { eventId: found.mission.eventId, path: `${base}/revisions`, method: "POST", createdId: null, tabId: null });
  announceRevisionCreated(found.mission.id);
}

/**
 * Adds a file a TAK app uploaded to the mission at once, like an item from a TAK app: into the
 * draft (on the "From TAK apps" layer) and into a new revision built from the latest synced one.
 * A file the mission already holds (same SHA-256) is left alone.
 */
export async function addMissionFile(found: VisibleMission, author: MissionAuthor, file: UploadedFile): Promise<MissionWriteResult> {
  if (!found.canWrite) {
    return "forbidden";
  }
  const missionId = found.mission.id;
  const contentId = randomUUID();
  const storageKey = await writeBlob(file.bytes);
  const outcome = await database
    .$transaction(async (transaction) => {
      const latest = await transaction.packageRevision.findFirst({ where: { packageId: missionId }, orderBy: { number: "desc" } });
      if (latest === null) {
        return null;
      }
      const synced = latest.snapshot as unknown as PackageSnapshot;
      const contents = synced.contents ?? [];
      if (contents.some(({ sha256 }) => sha256 === file.sha256) || contents.length >= MAX_FILES_PER_MISSION) {
        return null;
      }
      const snapshot: PackageSnapshot = { ...synced, layers: [...synced.layers], contents: [...contents] };
      const layerId = await takLayerId(transaction, missionId, snapshot);
      const blob = await transaction.storageBlob.create({
        data: { id: randomUUID(), storageKey, sha256: file.sha256, size: file.bytes.length, mediaType: mediaTypeOf(file.fileName) },
      });
      const archivePath = `${contentId}/${file.fileName}`;
      await transaction.packageContent.create({
        data: { id: contentId, packageId: missionId, layerId, blobId: blob.id, kind: MISSION_FILE_KIND, name: file.fileName, archivePath },
      });
      const entry: PackageSnapshotContent = {
        id: contentId,
        layerId,
        blobId: blob.id,
        kind: MISSION_FILE_KIND,
        name: file.fileName,
        archivePath,
        sha256: file.sha256,
        size: file.bytes.length,
        mediaType: blob.mediaType,
      };
      snapshot.contents = [...contents, entry];
      await saveTakRevision(transaction, found, author, latest.number, snapshot, {
        action: "mission.file-added",
        metadata: { contentId, size: file.bytes.length },
      });
      return entry;
    })
    .catch(async (error: unknown) => {
      await removeBlob(storageKey);
      throw error;
    });
  if (outcome === null) {
    await removeBlob(storageKey);
    return "ignored";
  }
  announce(found);
  return "applied";
}

/**
 * Removes a file from the mission by SHA-256, as `DELETE …/contents?hash=` does: from the draft
 * and in a new revision. Files on a locked layer of the draft stay. Earlier revisions keep the
 * stored file.
 */
export async function removeMissionFile(found: VisibleMission, author: MissionAuthor, sha256: string): Promise<MissionWriteResult> {
  if (!found.canWrite) {
    return "forbidden";
  }
  const missionId = found.mission.id;
  const outcome = await database.$transaction(async (transaction) => {
    const latest = await transaction.packageRevision.findFirst({ where: { packageId: missionId }, orderBy: { number: "desc" } });
    if (latest === null) {
      return null;
    }
    const synced = latest.snapshot as unknown as PackageSnapshot;
    const removed = (synced.contents ?? []).filter((content) => content.sha256 === sha256 && content.kind !== "icon-library");
    if (removed.length === 0) {
      return null;
    }
    const drafts = await transaction.packageContent.findMany({ where: { packageId: missionId, id: { in: removed.map(({ id }) => id) } }, include: { layer: true } });
    if (drafts.some(({ layer }) => layer.locked)) {
      return null;
    }
    await transaction.packageContent.deleteMany({ where: { id: { in: drafts.map(({ id }) => id) } } });
    const snapshot: PackageSnapshot = { ...synced, contents: (synced.contents ?? []).filter((content) => !removed.includes(content)) };
    await saveTakRevision(transaction, found, author, latest.number, snapshot, {
      action: "mission.file-removed",
      metadata: { contentIds: removed.map(({ id }) => id) },
    });
    return removed.map(({ blobId }) => blobId);
  });
  if (outcome === null) {
    return "ignored";
  }
  await removeUnreferencedBlobs(found.mission.eventId, outcome);
  announce(found);
  return "applied";
}
