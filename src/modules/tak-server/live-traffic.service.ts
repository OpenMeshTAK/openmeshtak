import type { Principal } from "../../shared/auth/principal.js";
import { database } from "../../shared/database/database.js";
import { requireEventPermission } from "../events/event-access.js";
import type { LiveTakTrafficDto } from "./live-traffic.dto.js";
import { cotRouter, type CotRouter } from "./streaming/cot-router.js";

/**
 * The event's live TAK traffic for users with `tak-traffic.view` on that event. Positions are
 * personal data, so this is a separate permission from reading the event, and it is not audited
 * per poll because the view refreshes every few seconds.
 */
export async function getLiveTakTraffic(principal: Principal, eventId: string, router: CotRouter = cotRouter): Promise<LiveTakTrafficDto> {
  await requireEventPermission(principal, eventId, "tak-traffic.view");
  const { connections, items } = router.snapshot(eventId);
  const users = await database.domainUser.findMany({
    where: { id: { in: [...new Set(connections.map(({ userId }) => userId))] } },
    select: { id: true, displayName: true },
  });
  const names = new Map(users.map(({ id, displayName }) => [id, displayName]));
  return {
    connections: connections.map((connection) => ({
      id: connection.id,
      userId: connection.userId,
      userDisplayName: names.get(connection.userId) ?? "Unknown user",
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
    })),
  };
}
