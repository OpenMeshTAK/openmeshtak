import { recordAudit } from "../../shared/audit/audit.js";
import type { ActorContext, Principal } from "../../shared/auth/principal.js";
import { database } from "../../shared/database/database.js";
import { notFoundProblem } from "../../shared/errors/problem-error.js";
import {
  afterCursor,
  CURSOR_ORDER,
  DEFAULT_PAGE_LIMIT,
  decodeCursor,
  toPage,
} from "../../shared/pagination/cursor.js";
import { eventArchivedProblem, requireEventPermission } from "../events/event-access.js";
import type { EventMemberDto, EventMemberPage } from "./event-member.dto.js";
import { eventMemberSelection, toEventMemberDto } from "./event-member.mapper.js";

export async function listEventMembers(
  principal: Principal,
  eventId: string,
  limit = DEFAULT_PAGE_LIMIT,
  cursor?: string,
): Promise<EventMemberPage> {
  await requireEventPermission(principal, eventId, "members.read");
  const context = `events/${eventId}/members`;
  const position = cursor === undefined ? null : decodeCursor(context, cursor);

  const rows = await database.eventMember.findMany({
    where: { eventId, ...afterCursor(position) },
    orderBy: [...CURSOR_ORDER],
    take: limit + 1,
    select: eventMemberSelection,
  });
  return toPage(context, rows, limit, toEventMemberDto);
}

export async function getEventMember(
  principal: Principal,
  eventId: string,
  memberId: string,
): Promise<EventMemberDto> {
  await requireEventPermission(principal, eventId, "members.read");

  const row = await database.eventMember.findFirst({
    where: { id: memberId, eventId },
    select: eventMemberSelection,
  });
  if (row === null) {
    throw notFoundProblem();
  }
  return toEventMemberDto(row);
}

/**
 * Removes only this event participation. The global user, external identities and memberships
 * in other events stay. Personal artifacts and download grants join this transaction once they
 * exist.
 */
export async function deleteEventMember(
  actor: ActorContext,
  eventId: string,
  memberId: string,
): Promise<void> {
  const event = await requireEventPermission(actor.principal, eventId, "members.manage");
  if (event.status === "archived") {
    throw eventArchivedProblem();
  }

  await database.$transaction(async (transaction) => {
    const removed = await transaction.eventMember.deleteMany({ where: { id: memberId, eventId } });
    if (removed.count === 0) {
      throw notFoundProblem();
    }
    await recordAudit(
      {
        actor: actor.principal,
        action: "event-member.deleted",
        targetType: "event-member",
        targetId: memberId,
        result: "success",
        traceId: actor.traceId,
        metadata: { eventId },
      },
      transaction,
    );
  });
}
