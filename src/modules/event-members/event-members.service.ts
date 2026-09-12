import { recordAudit } from "../../shared/audit/audit.js";
import type { ActorContext, Principal } from "../../shared/auth/principal.js";
import { database } from "../../shared/database/database.js";
import { isUniqueConstraintError } from "../../shared/database/unique-constraint.js";
import {
  notFoundProblem,
  type ProblemFieldError,
  validationProblem,
  versionConflictProblem,
} from "../../shared/errors/problem-error.js";
import {
  afterCursor,
  CURSOR_ORDER,
  DEFAULT_PAGE_LIMIT,
  decodeCursor,
  toPage,
} from "../../shared/pagination/cursor.js";
import { eventArchivedProblem, requireEventPermission } from "../events/event-access.js";
import type { EventMemberDto, EventMemberPage, UpdateEventMemberRequest } from "./event-member.dto.js";
import { eventMemberSelection, toEventMemberDto } from "./event-member.mapper.js";
import {
  callsignFits,
  memberIdentityConflictProblem,
  nextShortNameNumber,
  renderCallsign,
  shortNameFits,
} from "./member-identity.js";

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

function assignmentProblems(
  role: { id: string } | null,
  group: { id: string } | null,
): ProblemFieldError[] {
  const errors: ProblemFieldError[] = [];
  if (role === null) {
    errors.push({ field: "eventRoleId", code: "NOT_FOUND", message: "No role with this ID exists in this event." });
  }
  if (group === null) {
    errors.push({ field: "eventGroupId", code: "NOT_FOUND", message: "No group with this ID exists in this event." });
  }
  return errors;
}

/**
 * Reassigns role and group or sets a callsign override, for example to resolve a callsign
 * conflict. A later integration sync may set role and group again; the override stays until an
 * administrator clears it. Moving to another group assigns the next free short-name number there.
 */
export async function updateEventMember(
  actor: ActorContext,
  eventId: string,
  memberId: string,
  input: UpdateEventMemberRequest,
): Promise<EventMemberDto> {
  const event = await requireEventPermission(actor.principal, eventId, "members.manage");
  if (event.status === "archived") {
    throw eventArchivedProblem();
  }
  const callsignOverride = input.callsignOverride?.trim() || null;

  try {
    return await database.$transaction(async (transaction) => {
      const current = await transaction.eventMember.findFirst({ where: { id: memberId, eventId } });
      if (current === null) {
        throw notFoundProblem();
      }
      if (current.version !== input.version) {
        throw versionConflictProblem(current.version);
      }

      const [role, group] = await Promise.all([
        transaction.eventRole.findFirst({ where: { id: input.eventRoleId, eventId }, select: { id: true } }),
        transaction.eventGroup.findFirst({
          where: { id: input.eventGroupId, eventId },
          select: { id: true, name: true, callsignFormat: true, shortNamePrefix: true },
        }),
      ]);
      if (role === null || group === null) {
        throw validationProblem(assignmentProblems(role, group));
      }

      const callsign = callsignOverride ?? renderCallsign(group.callsignFormat, current.username, group.name);
      let shortNameNumber = current.shortNameNumber;
      if (group.id !== current.eventGroupId) {
        const used = await transaction.eventMember.findMany({
          where: { eventGroupId: group.id },
          select: { shortNameNumber: true },
        });
        shortNameNumber = nextShortNameNumber(used.map((member) => member.shortNameNumber));
      }

      const identityErrors: ProblemFieldError[] = [];
      if (!callsignFits(callsign)) {
        identityErrors.push({ field: "callsignOverride", code: "TOO_LONG", message: "Callsign exceeds 39 bytes." });
      }
      const holder = await transaction.eventMember.findUnique({
        where: { eventId_callsign: { eventId, callsign } },
        select: { id: true },
      });
      if (holder !== null && holder.id !== memberId) {
        identityErrors.push({
          field: "callsignOverride",
          code: "CONFLICT",
          message: "Another member of this event already uses this callsign.",
        });
      }
      if (!shortNameFits(group.shortNamePrefix, shortNameNumber)) {
        identityErrors.push({ field: "eventGroupId", code: "EXHAUSTED", message: "The group has no free short name." });
      }
      if (identityErrors.length > 0) {
        throw memberIdentityConflictProblem(identityErrors);
      }

      const updated = await transaction.eventMember.updateMany({
        where: { id: memberId, eventId, version: input.version },
        data: {
          eventRoleId: role.id,
          eventGroupId: group.id,
          callsign,
          callsignOverride,
          shortNameNumber,
          version: { increment: 1 },
        },
      });
      if (updated.count !== 1) {
        const latest = await transaction.eventMember.findUnique({ where: { id: memberId }, select: { version: true } });
        throw latest === null ? notFoundProblem() : versionConflictProblem(latest.version);
      }
      await recordAudit(
        {
          actor: actor.principal,
          action: "event-member.updated",
          targetType: "event-member",
          targetId: memberId,
          result: "success",
          traceId: actor.traceId,
          metadata: { eventId, eventRoleId: role.id, eventGroupId: group.id, callsignOverride: callsignOverride !== null },
        },
        transaction,
      );
      return toEventMemberDto(
        await transaction.eventMember.findUniqueOrThrow({ where: { id: memberId }, select: eventMemberSelection }),
      );
    });
  } catch (error: unknown) {
    // A concurrent change took the callsign or short-name number after our checks.
    if (isUniqueConstraintError(error)) {
      throw memberIdentityConflictProblem([
        { field: "callsignOverride", code: "CONFLICT", message: "Another member took this name concurrently." },
      ]);
    }
    throw error;
  }
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
