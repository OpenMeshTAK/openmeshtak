import { recordAudit } from "../../shared/audit/audit.js";
import type { ActorContext } from "../../shared/auth/principal.js";
import { database } from "../../shared/database/database.js";
import { notFoundProblem, ProblemError } from "../../shared/errors/problem-error.js";
import { eventArchivedProblem, requireEventPermission } from "../events/event-access.js";
import type { EventMemberDto } from "./event-member.dto.js";
import { eventMemberSelection, toEventMemberDto } from "./event-member.mapper.js";
import { memberIdentityConflictProblem, shortNameFits } from "./member-identity.js";

export interface ReorderGroupMembersRequest {
  /** Every member of the group exactly once, in the new short-name order (first becomes 1). */
  memberIds: string[];
}

function staleOrder(): ProblemError {
  return new ProblemError({
    type: "urn:openmeshtak:problem:stale-member-order",
    title: "Group members changed",
    status: 409,
    detail: "Members joined or left this group meanwhile. Reload and reorder again.",
    code: "STALE_MEMBER_ORDER",
  });
}

/**
 * Renumbers a group's members `1..n` in the given order, which changes their Meshtastic short
 * names (`B1`, `B2`, ...). The request must name exactly the current members, so a concurrent
 * join or move fails instead of being silently numbered. Already issued artifacts keep the old
 * short names until members are provisioned again.
 */
export async function reorderGroupMembers(
  actor: ActorContext,
  eventId: string,
  groupId: string,
  input: ReorderGroupMembersRequest,
): Promise<EventMemberDto[]> {
  const event = await requireEventPermission(actor.principal, eventId, "members.manage");
  if (event.status === "archived") {
    throw eventArchivedProblem();
  }
  const group = await database.eventGroup.findFirst({ where: { id: groupId, eventId }, select: { id: true, shortNamePrefix: true } });
  if (group === null) {
    throw notFoundProblem();
  }
  if (!shortNameFits(group.shortNamePrefix, input.memberIds.length)) {
    throw memberIdentityConflictProblem([
      { field: "memberIds", code: "SHORT_NAME_TOO_LONG", message: "The highest number would not fit the 4-byte short name." },
    ]);
  }

  await database.$transaction(async (transaction) => {
    const members = await transaction.eventMember.findMany({ where: { eventGroupId: groupId }, select: { id: true, shortNameNumber: true } });
    const current = new Set(members.map(({ id }) => id));
    const requested = new Set(input.memberIds);
    if (requested.size !== input.memberIds.length || requested.size !== current.size || input.memberIds.some((id) => !current.has(id))) {
      throw staleOrder();
    }
    // Numbers are unique per group, so move everyone to temporary negative numbers first.
    for (const [index, id] of input.memberIds.entries()) {
      await transaction.eventMember.update({ where: { id }, data: { shortNameNumber: -(index + 1) } });
    }
    for (const [index, id] of input.memberIds.entries()) {
      await transaction.eventMember.update({ where: { id }, data: { shortNameNumber: index + 1, version: { increment: 1 } } });
    }
    await recordAudit(
      {
        actor: actor.principal,
        action: "event-group.members-renumbered",
        targetType: "event-group",
        targetId: groupId,
        result: "success",
        traceId: actor.traceId,
        metadata: {
          eventId,
          changes: input.memberIds.flatMap((id, index) => {
            const before = members.find((member) => member.id === id)?.shortNameNumber;
            return before === index + 1 ? [] : [{ memberId: id, from: before, to: index + 1 }];
          }),
        },
      },
      transaction,
    );
  });

  const rows = await database.eventMember.findMany({
    where: { eventGroupId: groupId },
    orderBy: { shortNameNumber: "asc" },
    select: eventMemberSelection,
  });
  return rows.map(toEventMemberDto);
}
