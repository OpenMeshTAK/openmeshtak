import { hasPermission } from "../../shared/auth/permission-check.js";
import type { Principal } from "../../shared/auth/principal.js";
import { database } from "../../shared/database/database.js";
import { notFoundProblem } from "../../shared/errors/problem-error.js";

export interface MemberArtifactAccess {
  /** True when an operator acts for the member instead of the member themself. */
  onBehalf: boolean;
}

/**
 * Personal artifacts exist only for active events and only for signed-in users: the member
 * themself, or an operator with `member-artifacts.download` for this event who downloads on the
 * member's behalf, for example to flash a radio on site. Service accounts never receive them.
 * Everything else looks like a missing member so foreign members cannot be probed.
 */
export async function requireMemberArtifactAccess(
  principal: Principal,
  eventId: string,
  memberId: string,
): Promise<MemberArtifactAccess> {
  if (principal.type !== "user") {
    throw notFoundProblem();
  }
  const member = await database.eventMember.findFirst({
    where: { id: memberId, eventId },
    select: { userId: true, event: { select: { status: true } } },
  });
  if (member === null || member.event.status !== "active") {
    throw notFoundProblem();
  }
  if (member.userId === principal.id) {
    return { onBehalf: false };
  }
  if (await hasPermission(principal, "member-artifacts.download", eventId)) {
    return { onBehalf: true };
  }
  throw notFoundProblem();
}
