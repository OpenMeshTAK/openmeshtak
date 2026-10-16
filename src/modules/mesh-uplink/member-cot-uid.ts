import { database } from "../../shared/database/database.js";
import type { CotRouter } from "../tak-server/streaming/cot-router.js";

export interface BoundMember {
  memberId: string;
  userId: string;
}

/**
 * The CoT UID a bound node's positions use, so they join the member's TAK track: the member's TAK
 * app that reported itself most recently in this event, else the newest TAK position recorded for
 * the member, else the device UID of the member's newest TAK certificate. A member whose TAK app
 * Core never saw gets a stable member-derived UID.
 */
export async function memberCotUid(eventId: string, member: BoundMember, router: CotRouter): Promise<string> {
  const live = router.latestDevice(eventId, member.userId);
  if (live !== null) {
    return live.uid;
  }
  const recorded = await database.takTrafficItem.findFirst({
    where: { eventId, userId: member.userId, source: "tak", selfReported: true },
    orderBy: { time: "desc" },
    select: { uid: true },
  });
  if (recorded !== null) {
    return recorded.uid;
  }
  const certificate = await database.takClientCertificate.findFirst({
    where: { userId: member.userId, revokedAt: null, clientUid: { not: null } },
    orderBy: { createdAt: "desc" },
    select: { clientUid: true },
  });
  return certificate?.clientUid ?? `openmeshtak-member-${member.memberId}`;
}
