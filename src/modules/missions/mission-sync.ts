import { database } from "../../shared/database/database.js";
import { logger } from "../../shared/logging/logger.js";
import { objectToCot } from "../data-packages/atak/cot-export.js";
import { onRevisionCreated } from "../data-packages/package-revision-events.js";
import type { PackageSnapshot } from "../data-packages/package-snapshot.js";
import { cotRouter } from "../tak-server/streaming/cot-router.js";
import { takAccessFor } from "../tak-server/tak-access.js";
import { visibleMissionsFor } from "./mission-access.js";
import { changesBetween, creatorUidOf, fileChangesBetween, missionChangeNotification } from "./mission-format.js";

/**
 * After a mission revision (a Sync in the editor or a change from a TAK app), every subscribed app
 * that is connected receives the added and changed items as CoT and one `t-x-m-c` notification
 * listing all changes, as TAK Server does. Apps that are offline catch up from
 * `/Marti/api/missions/{name}/changes` when they reconnect. Subscribers who lost access to the
 * mission receive nothing.
 */
export async function announceMissionRevision(missionId: string): Promise<void> {
  const [latest, previous] = await database.packageRevision.findMany({
    where: { packageId: missionId },
    orderBy: { number: "desc" },
    take: 2,
  });
  const mission = await database.dataPackage.findUnique({ where: { id: missionId } });
  if (latest === undefined || mission === null || mission.kind !== "mission") {
    return;
  }
  const changes = changesBetween(
    previous === undefined ? null : (previous.snapshot as unknown as PackageSnapshot),
    latest.snapshot as unknown as PackageSnapshot,
    latest.createdAt,
    creatorUidOf(latest),
  );
  const fileChanges = fileChangesBetween(
    previous === undefined ? null : (previous.snapshot as unknown as PackageSnapshot),
    latest.snapshot as unknown as PackageSnapshot,
    latest.createdAt,
    creatorUidOf(latest),
  );
  if (changes.length === 0 && fileChanges.length === 0) {
    return;
  }
  const notification = missionChangeNotification(mission, changes, new Date(), fileChanges);
  const items = changes.filter(({ type }) => type === "ADD_CONTENT").map(({ object }) => objectToCot(object, latest.createdAt));

  const subscriptions = await database.missionSubscription.findMany({ where: { packageId: missionId } });
  for (const subscription of subscriptions) {
    // The app that made a change from TAK already has it.
    if (subscription.clientUid === creatorUidOf(latest)) {
      continue;
    }
    const visible = await visibleMissionsFor(subscription.userId, await takAccessFor(subscription.userId));
    if (!visible.some(({ mission: { id } }) => id === missionId)) {
      continue;
    }
    for (const xml of [...items, notification]) {
      cotRouter.sendToDevice(subscription.userId, subscription.clientUid, xml);
    }
  }
  logger.info(
    { event: "mission_revision_announced", missionId, changes: changes.length + fileChanges.length, subscriptions: subscriptions.length },
    "Mission revision announced",
  );
}

onRevisionCreated(announceMissionRevision);
