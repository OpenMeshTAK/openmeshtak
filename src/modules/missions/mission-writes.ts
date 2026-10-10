import { randomUUID } from "node:crypto";
import type { Prisma } from "../../generated/prisma/client.js";
import { recordAudit } from "../../shared/audit/audit.js";
import { database } from "../../shared/database/database.js";
import { convertCotEvent } from "../data-packages/atak/cot-import.js";
import { geometryProblems, kindOf } from "../data-packages/geometry.js";
import { estimateAtakExportSize } from "../data-packages/package-export-size.js";
import { DEFAULT_STYLE, MAX_OBJECTS_PER_PACKAGE } from "../data-packages/package-objects.service.js";
import { announceRevisionCreated } from "../data-packages/package-revision-events.js";
import { hashPackageSnapshot, snapshotObjectOf, type PackageSnapshot } from "../data-packages/package-snapshot.js";
import { clearDraftHash } from "../data-packages/package-state.js";
import { takColumn } from "../data-packages/tak-marker.js";
import { eventChanges } from "../events/event-changes.js";
import type { TakAccess } from "../tak-server/tak-access.js";
import { findVisibleMission, type VisibleMission } from "./mission-access.js";

/** Items from TAK apps that are not on any layer yet land on this layer of the mission. */
const TAK_LAYER_NAME = "From TAK apps";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface MissionAuthor {
  userId: string;
  /** The TAK app's device UID, reported as the change's creator. */
  clientUid: string;
}

export type MissionItemWrite = { kind: "upsert"; xml: string } | { kind: "remove"; uid: string };

export type MissionWriteResult = "applied" | "ignored" | "forbidden";

/**
 * Applies a change made in a TAK app to the mission at once, without the planner's unsynced
 * draft: the item is changed in the draft (so the editor shows it) and in a new revision built
 * from the latest synced revision plus this one item (so other subscribers receive it). Items are
 * keyed by their CoT UID, which ATAK creates as a UUID; other UIDs are ignored. The newest change
 * of an item wins, whether it came from the editor or a TAK app.
 */
export async function writeMissionItem(found: VisibleMission, author: MissionAuthor, write: MissionItemWrite): Promise<MissionWriteResult> {
  if (!found.canWrite) {
    return "forbidden";
  }
  const missionId = found.mission.id;
  let uid: string;
  let candidate = null;
  if (write.kind === "upsert") {
    const conversion = convertCotEvent(write.xml, DEFAULT_STYLE);
    const match = /<event\b[^>]*\buid="([^"]+)"/.exec(write.xml);
    // One mission item per CoT UID, so a freehand drawing with several strokes is left out.
    const only = conversion.outcome === "accepted" && conversion.candidates.length === 1 ? conversion.candidates[0] : undefined;
    if (only === undefined || match?.[1] === undefined || geometryProblems(only.geometry).length > 0) {
      return "ignored";
    }
    uid = match[1];
    candidate = only;
  } else {
    uid = write.uid;
  }
  if (!UUID.test(uid)) {
    return "ignored";
  }
  uid = uid.toLowerCase();

  const outcome = await database.$transaction(async (transaction) => {
    const latest = await transaction.packageRevision.findFirst({ where: { packageId: missionId }, orderBy: { number: "desc" } });
    if (latest === null) {
      return null;
    }
    const synced = latest.snapshot as unknown as PackageSnapshot;
    const snapshot: PackageSnapshot = { ...synced, layers: [...synced.layers], objects: [...synced.objects] };
    const existing = await transaction.packageObject.findFirst({ where: { id: uid, packageId: missionId } });
    let createdId: string | null = null;

    if (candidate === null) {
      if (existing === null && !snapshot.objects.some(({ id }) => id === uid)) {
        return null;
      }
      await transaction.packageObject.deleteMany({ where: { id: uid, packageId: missionId } });
      snapshot.objects = snapshot.objects.filter(({ id }) => id !== uid);
    } else {
      const layerId = existing?.layerId ?? (await takLayerId(transaction, missionId, snapshot));
      if (existing === null && (await transaction.packageObject.count({ where: { packageId: missionId } })) >= MAX_OBJECTS_PER_PACKAGE) {
        return null;
      }
      const data = {
        layerId,
        kind: kindOf(candidate.geometry),
        name: candidate.name,
        description: candidate.description,
        geometry: candidate.geometry as unknown as Prisma.InputJsonValue,
        style: candidate.style as unknown as Prisma.InputJsonValue,
        tak: takColumn(candidate.geometry, candidate.tak),
      };
      const row =
        existing === null
          ? await transaction.packageObject.create({ data: { id: uid, packageId: missionId, ...data } })
          : await transaction.packageObject.update({ where: { id: uid }, data });
      createdId = existing === null ? uid : null;
      const item = snapshotObjectOf(row);
      const position = snapshot.objects.findIndex(({ id }) => id === uid);
      if (position >= 0) {
        snapshot.objects[position] = item;
      } else {
        // Like the draft order: by layer, newest last within its layer.
        const layerIndex = snapshot.layers.findIndex(({ id }) => id === layerId);
        const after = snapshot.objects.findLastIndex((object) => snapshot.layers.findIndex(({ id }) => id === object.layerId) <= layerIndex);
        snapshot.objects.splice(after + 1, 0, item);
      }
    }
    await saveTakRevision(transaction, found, author, latest.number, snapshot, {
      action: candidate === null ? "mission.item-removed" : "mission.item-changed",
      metadata: { uid },
    });
    return { createdId };
  });
  if (outcome === null) {
    return "ignored";
  }

  // Open editors apply the item and the new revision like any other change.
  const base = `data-packages/${missionId}`;
  eventChanges.emit("changed", {
    eventId: found.mission.eventId,
    path: `${base}/objects/${uid}`,
    method: candidate === null ? "DELETE" : outcome.createdId === null ? "PUT" : "POST",
    createdId: outcome.createdId,
    tabId: null,
  });
  eventChanges.emit("changed", { eventId: found.mission.eventId, path: `${base}/revisions`, method: "POST", createdId: null, tabId: null });
  announceRevisionCreated(missionId);
  return "applied";
}

/**
 * Stores a change from a TAK app as the mission's next revision: the latest synced revision plus
 * that one change, so the planner's unsynced draft stays private. The draft changed as well, so
 * its hash is cleared.
 */
export async function saveTakRevision(
  transaction: Prisma.TransactionClient,
  found: VisibleMission,
  author: MissionAuthor,
  latestNumber: number,
  snapshot: PackageSnapshot,
  audit: { action: string; metadata: Record<string, unknown> },
): Promise<void> {
  const missionId = found.mission.id;
  await clearDraftHash(transaction, missionId);
  const createdAt = new Date();
  const revision = await transaction.packageRevision.create({
    data: {
      id: randomUUID(),
      packageId: missionId,
      number: latestNumber + 1,
      snapshot: snapshot as unknown as Prisma.InputJsonObject,
      snapshotHash: hashPackageSnapshot(snapshot),
      exportSize: estimateAtakExportSize(snapshot, createdAt),
      createdAt,
      // The TAK app made this revision; mission changes report its device UID as creator.
      createdByType: "tak-client",
      createdById: author.clientUid,
    },
  });
  await recordAudit(
    {
      actor: { type: "user", id: author.userId },
      action: audit.action,
      targetType: "data-package",
      targetId: missionId,
      result: "success",
      metadata: { eventId: found.mission.eventId, ...audit.metadata, revision: revision.number, clientUid: author.clientUid },
    },
    transaction,
  );
}

/** The mission's layer for items from TAK apps, created in the draft and the revision when needed. */
export async function takLayerId(transaction: Prisma.TransactionClient, missionId: string, snapshot: PackageSnapshot): Promise<string> {
  const known = await transaction.packageLayer.findFirst({ where: { packageId: missionId, name: TAK_LAYER_NAME } });
  const layer =
    known ??
    (await transaction.packageLayer.create({
      data: {
        id: randomUUID(),
        packageId: missionId,
        name: TAK_LAYER_NAME,
        sortOrder: ((await transaction.packageLayer.aggregate({ where: { packageId: missionId }, _max: { sortOrder: true } }))._max.sortOrder ?? -1) + 1,
      },
    }));
  if (!snapshot.layers.some(({ id }) => id === layer.id)) {
    snapshot.layers.push({ id: layer.id, name: layer.name, sortOrder: layer.sortOrder, visible: layer.visible });
  }
  return layer.id;
}

/**
 * CoT a TAK app sent with `<marti><dest mission="…"/>`: the item goes into each named mission the
 * user may change. Unknown missions and missions without write access are left alone.
 */
export async function writeFromStream(userId: string, access: TakAccess, clientUid: string | null, missionNames: string[], xml: string): Promise<void> {
  for (const name of new Set(missionNames)) {
    const found = await findVisibleMission(userId, access, { name });
    if (found !== null) {
      await writeMissionItem(found, { userId, clientUid: clientUid ?? "" }, { kind: "upsert", xml });
    }
  }
}
