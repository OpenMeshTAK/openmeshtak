import { loadContentFiles } from "../data-packages/package-content-files.js";
import type { PackageSnapshot, PackageSnapshotContent } from "../data-packages/package-snapshot.js";
import type { TakAccess } from "../tak-server/tak-access.js";
import { visibleMissionsFor } from "./mission-access.js";

export interface MissionFile {
  missionId: string;
  eventId: string;
  file: PackageSnapshotContent;
  bytes: Uint8Array;
}

/**
 * A file of a synced mission the user may see, by its SHA-256 as Data Sync downloads it from
 * `/Marti/sync/content?hash=`. Files of the planner's unsynced draft are never served.
 */
export async function missionFileByHash(userId: string, access: TakAccess, hash: string): Promise<MissionFile | null> {
  if (!/^[0-9a-f]{64}$/.test(hash)) {
    return null;
  }
  for (const { mission, latest } of await visibleMissionsFor(userId, access)) {
    const file = ((latest.snapshot as unknown as PackageSnapshot).contents ?? []).find(({ sha256, kind }) => sha256 === hash && kind !== "icon-library");
    if (file !== undefined) {
      const [loaded] = await loadContentFiles([file]);
      return loaded === undefined ? null : { missionId: mission.id, eventId: mission.eventId, file, bytes: loaded.bytes };
    }
  }
  return null;
}

