import type { Principal } from "../../shared/auth/principal.js";
import { database } from "../../shared/database/database.js";
import { requireEventPermission } from "../events/event-access.js";
import type { LiveTakItemDto, LiveTakTrafficDto } from "./live-traffic.dto.js";
import { cotRouter, type CotRouter, type LiveItem, type LiveMeshItem } from "./streaming/cot-router.js";

function itemFields(item: LiveItem): Pick<LiveTakItemDto, "uid" | "type" | "callsign" | "lat" | "lon" | "course" | "speed" | "time" | "stale"> {
  return {
    uid: item.uid,
    type: item.type,
    callsign: item.callsign,
    lat: item.lat,
    lon: item.lon,
    course: item.course,
    speed: item.speed,
    time: item.time.toISOString(),
    stale: item.stale.toISOString(),
  };
}

function meshDetails({ mesh }: LiveMeshItem): NonNullable<LiveTakItemDto["mesh"]> {
  return {
    nodeNum: Number.parseInt(mesh.nodeId.slice(1), 16),
    nodeId: mesh.nodeId,
    shortName: mesh.shortName,
    longName: mesh.longName,
    memberId: mesh.memberId,
    hq: { id: mesh.hqId, name: mesh.hqName },
    receivedAt: mesh.receivedAt.toISOString(),
    batteryLevel: mesh.batteryLevel,
    snr: mesh.snr,
    rssi: mesh.rssi,
    hopsAway: mesh.hopsAway,
    channel: mesh.channel === null ? null : { index: mesh.channel.index, ...(mesh.channel.name === null ? {} : { name: mesh.channel.name }) },
  };
}

/**
 * The event's live TAK traffic for users with `tak-traffic.view` on that event. Positions are
 * personal data, so this is a separate permission from reading the event, and it is not audited
 * per poll because the view refreshes every few seconds. Each item names the app and member that
 * sent it, with the member's group in this event only, so viewers can hide a group's markers; the
 * same viewers already see every connected app with its user and group. Mesh positions an HQ
 * uploaded are listed with `source: "mesh"` and their provenance; they never reach TAK apps.
 */
export async function getLiveTakTraffic(principal: Principal, eventId: string, router: CotRouter = cotRouter): Promise<LiveTakTrafficDto> {
  await requireEventPermission(principal, eventId, "tak-traffic.view");
  const { connections, items, meshItems } = router.snapshot(eventId);
  const meshUserIds = meshItems.flatMap(({ userId }) => (userId === null ? [] : [userId]));
  const userIds = [...new Set([...[...connections, ...items].map(({ userId }) => userId), ...meshUserIds])];
  const [users, members] = await Promise.all([
    database.domainUser.findMany({ where: { id: { in: userIds } }, select: { id: true, displayName: true } }),
    database.eventMember.findMany({
      where: { eventId, userId: { in: userIds } },
      select: { userId: true, eventGroup: { select: { id: true, name: true } }, eventRole: { select: { id: true, name: true } } },
    }),
  ]);
  const names = new Map(users.map(({ id, displayName }) => [id, displayName]));
  const assignments = new Map(members.map((member) => [member.userId, member]));
  const nameOf = (userId: string): string => names.get(userId) ?? "Unknown user";
  return {
    connections: connections.map((connection) => ({
      id: connection.id,
      userId: connection.userId,
      userDisplayName: nameOf(connection.userId),
      eventGroup: assignments.get(connection.userId)?.eventGroup ?? null,
      eventRole: assignments.get(connection.userId)?.eventRole ?? null,
      callsign: connection.callsign,
      connectedAt: connection.connectedAt.toISOString(),
      lastSeenAt: connection.lastSeenAt.toISOString(),
    })),
    items: [
      ...items.map((item): LiveTakItemDto => ({
        ...itemFields(item),
        source: "tak",
        placedBy: {
          connectionId: item.connectionId,
          userId: item.userId,
          userDisplayName: nameOf(item.userId),
          eventGroup: assignments.get(item.userId)?.eventGroup ?? null,
        },
      })),
      ...meshItems.map(
        (entry): LiveTakItemDto => ({
          ...itemFields(entry.item),
          source: "mesh",
          placedBy:
            entry.userId === null
              ? null
              : {
                  connectionId: null,
                  userId: entry.userId,
                  userDisplayName: nameOf(entry.userId),
                  eventGroup: assignments.get(entry.userId)?.eventGroup ?? null,
                },
          mesh: meshDetails(entry),
        }),
      ),
    ],
  };
}
