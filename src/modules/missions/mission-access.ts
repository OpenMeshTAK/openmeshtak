import type { DataPackage, PackageRevision } from "../../generated/prisma/client.js";
import { database } from "../../shared/database/database.js";
import { audienceFromSelectors, audienceIncludes } from "../event-audience/event-audience.js";
import { receivedPackages } from "../member-data-packages/member-data-packages.service.js";
import type { TakAccess } from "../tak-server/tak-access.js";

/** A synced mission a TAK user may see, at its newest revision, and whether they may change it. */
export interface VisibleMission {
  mission: DataPackage;
  latest: PackageRevision;
  canWrite: boolean;
}

/**
 * Missions follow the Data Package audience rule: members see the synced missions whose audience
 * includes them in their active events; TAK administrators see every synced mission of the active
 * events and may change them. Members may change a mission from a TAK app only when its writers
 * include them. Unsynced missions do not exist for TAK apps yet.
 */
export async function visibleMissionsFor(userId: string, access: TakAccess): Promise<VisibleMission[]> {
  if (access.admin) {
    const missions = await database.dataPackage.findMany({
      where: { kind: "mission", eventId: { in: access.eventIds }, revisions: { some: {} } },
      orderBy: { name: "asc" },
      include: { revisions: { orderBy: { number: "desc" }, take: 1 } },
    });
    return missions.flatMap(({ revisions, ...mission }) =>
      revisions[0] === undefined ? [] : [{ mission, latest: revisions[0], canWrite: true }],
    );
  }
  const memberships = await database.eventMember.findMany({
    where: { userId, eventId: { in: access.eventIds } },
    select: { id: true, eventId: true, eventRoleId: true, eventGroupId: true },
  });
  const visible: VisibleMission[] = [];
  for (const member of memberships) {
    const recipient = { memberId: member.id, eventRoleId: member.eventRoleId, eventGroupId: member.eventGroupId };
    const received = await receivedPackages(member.eventId, recipient, "mission");
    const writers = await database.dataPackageWriter.findMany({ where: { packageId: { in: received.map(({ dataPackage }) => dataPackage.id) } } });
    for (const { dataPackage, latest } of received) {
      const selectors = writers.filter(({ packageId }) => packageId === dataPackage.id);
      visible.push({ mission: dataPackage, latest, canWrite: audienceIncludes(audienceFromSelectors(selectors), recipient) });
    }
  }
  return visible;
}

/**
 * TAK apps address missions by name or GUID (the mission ID). Names are unique per event; if two
 * of the user's events use the same name, the first one found wins, and the GUID stays exact.
 */
export async function findVisibleMission(
  userId: string,
  access: TakAccess,
  reference: { name?: string; guid?: string },
): Promise<VisibleMission | null> {
  const missions = await visibleMissionsFor(userId, access);
  return (
    missions.find(({ mission }) => (reference.guid === undefined ? mission.name === reference.name : mission.id === reference.guid)) ?? null
  );
}
