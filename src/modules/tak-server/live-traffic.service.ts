import type { Principal } from "../../shared/auth/principal.js";
import { database } from "../../shared/database/database.js";
import { requireEventPermission } from "../events/event-access.js";
import type { LiveTakTrafficDto } from "./live-traffic.dto.js";
import { cotRouter, type CotRouter } from "./streaming/cot-router.js";

/**
 * The event's live TAK traffic for users with `tak-traffic.view` on that event. Positions are
 * personal data, so this is a separate permission from reading the event, and it is not audited
 * per poll because the view refreshes every few seconds. Each item names the app and member that
 * sent it, with the member's group in this event only, so viewers can hide a group's markers; the
 * same viewers already see every connected app with its user and group.
 */
export async function getLiveTakTraffic(principal: Principal, eventId: string, router: CotRouter = cotRouter): Promise<LiveTakTrafficDto> {
  await requireEventPermission(principal, eventId, "tak-traffic.view");
  const { connections, items } = router.snapshot(eventId);
  const userIds = [...new Set([...connections, ...items].map(({ userId }) => userId))];
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
    items: items.map((item) => ({
      uid: item.uid,
      type: item.type,
      callsign: item.callsign,
      lat: item.lat,
      lon: item.lon,
      course: item.course,
      speed: item.speed,
      time: item.time.toISOString(),
      stale: item.stale.toISOString(),
      placedBy: {
        connectionId: item.connectionId,
        userId: item.userId,
        userDisplayName: nameOf(item.userId),
        eventGroup: assignments.get(item.userId)?.eventGroup ?? null,
      },
    })),
  };
}
