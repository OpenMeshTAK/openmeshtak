import { randomUUID } from "node:crypto";
import { recordAudit } from "../../shared/audit/audit.js";
import type { ActorContext, Principal } from "../../shared/auth/principal.js";
import { database } from "../../shared/database/database.js";
import {
  notFoundProblem,
  ProblemError,
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
import type { Prisma } from "../../generated/prisma/client.js";
import { accountEventIdFor } from "../users/event-accounts.js";
import { createAccountWithSetupLink } from "../users/user-setup-links.service.js";
import type {
  CreatedEventMemberAccountResponse,
  CreateEventMemberAccountRequest,
  CreateEventMemberRequest,
  EventMemberDto,
  EventMemberPage,
  MemberAssignmentInput,
  UpdateEventMemberRequest,
} from "./event-member.dto.js";
import { eventMemberSelection, toEventMemberDto } from "./event-member.mapper.js";
import {
  concurrentAssignmentProblem,
  resolveAssignment,
  type ResolvedAssignment,
} from "./member-assignment.js";

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

function auditMember(actor: ActorContext, action: string, memberId: string, eventId: string, assignment: ResolvedAssignment) {
  return {
    actor: actor.principal,
    action,
    targetType: "event-member",
    targetId: memberId,
    result: "success" as const,
    traceId: actor.traceId,
    metadata: {
      eventId,
      eventRoleId: assignment.eventRoleId,
      eventGroupId: assignment.eventGroupId,
      callsignOverride: assignment.callsignOverride !== null,
    },
  };
}

function memberExistsProblem(): ProblemError {
  return new ProblemError({
    type: "urn:openmeshtak:problem:member-exists",
    title: "Already a member",
    status: 409,
    detail: "This user is already a member of this event.",
    code: "MEMBER_EXISTS",
  });
}

/**
 * Adds an existing OpenMeshTak user, for example a local administrator, without an external
 * identity. The user's display name feeds the group's callsign format. Nothing about the user's
 * credentials, sessions or user groups changes.
 */
export async function createEventMember(
  actor: ActorContext,
  eventId: string,
  input: CreateEventMemberRequest,
): Promise<EventMemberDto> {
  const event = await requireEventPermission(actor.principal, eventId, "members.manage");
  if (event.status === "archived") {
    throw eventArchivedProblem();
  }

  try {
    return await database.$transaction(async (transaction) => {
      const user = await transaction.domainUser.findUnique({
        where: { id: input.userId },
        select: { id: true, displayName: true },
      });
      if (user === null) {
        throw validationProblem([{ field: "userId", code: "NOT_FOUND", message: "No user with this ID exists." }]);
      }
      const existing = await transaction.eventMember.findUnique({
        where: { eventId_userId: { eventId, userId: user.id } },
        select: { id: true },
      });
      if (existing !== null) {
        throw memberExistsProblem();
      }
      return await addMember(transaction, actor, eventId, user, input);
    });
  } catch (error: unknown) {
    throw concurrentAssignmentProblem(error);
  }
}

async function addMember(
  transaction: Prisma.TransactionClient,
  actor: ActorContext,
  eventId: string,
  user: { id: string; displayName: string },
  input: MemberAssignmentInput,
): Promise<EventMemberDto> {
  const assignment = await resolveAssignment(
    transaction,
    eventId,
    { ...input, callsignOverride: input.callsignOverride?.trim() || null, username: user.displayName },
    null,
  );
  const memberId = randomUUID();
  await transaction.eventMember.create({
    data: { id: memberId, eventId, userId: user.id, username: user.displayName, ...assignment },
  });
  await recordAudit(auditMember(actor, "event-member.created", memberId, eventId, assignment), transaction);
  return toEventMemberDto(
    await transaction.eventMember.findUniqueOrThrow({ where: { id: memberId }, select: eventMemberSelection }),
  );
}

/**
 * Creates a new person directly as a member and returns their single-use setup link. The account
 * is an event account, deleted when the event is archived, unless the event keeps its accounts.
 * Requires the event's `member-accounts.create`; the account gets no permissions beyond this event.
 */
export async function createEventMemberAccount(
  actor: ActorContext,
  eventId: string,
  input: CreateEventMemberAccountRequest,
): Promise<CreatedEventMemberAccountResponse> {
  const event = await requireEventPermission(actor.principal, eventId, "member-accounts.create");
  if (event.status === "archived") {
    throw eventArchivedProblem();
  }
  const account = { displayName: input.displayName, ...(input.username === undefined ? {} : { username: input.username }) };
  try {
    const { response, result } = await createAccountWithSetupLink(actor, account, accountEventIdFor(event), (transaction, user) =>
      addMember(transaction, actor, eventId, user, input),
    );
    return { member: result, user: response.user, setupLink: response.setupLink };
  } catch (error: unknown) {
    throw concurrentAssignmentProblem(error);
  }
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

  try {
    return await database.$transaction(async (transaction) => {
      const current = await transaction.eventMember.findFirst({ where: { id: memberId, eventId } });
      if (current === null) {
        throw notFoundProblem();
      }
      if (current.version !== input.version) {
        throw versionConflictProblem(current.version);
      }

      const assignment = await resolveAssignment(
        transaction,
        eventId,
        { ...input, callsignOverride: input.callsignOverride?.trim() || null, username: current.username },
        { memberId, eventGroupId: current.eventGroupId, shortNameNumber: current.shortNameNumber },
      );
      const updated = await transaction.eventMember.updateMany({
        where: { id: memberId, eventId, version: input.version },
        data: { ...assignment, version: { increment: 1 } },
      });
      if (updated.count !== 1) {
        const latest = await transaction.eventMember.findUnique({ where: { id: memberId }, select: { version: true } });
        throw latest === null ? notFoundProblem() : versionConflictProblem(latest.version);
      }
      await recordAudit(auditMember(actor, "event-member.updated", memberId, eventId, assignment), transaction);
      return toEventMemberDto(
        await transaction.eventMember.findUniqueOrThrow({ where: { id: memberId }, select: eventMemberSelection }),
      );
    });
  } catch (error: unknown) {
    throw concurrentAssignmentProblem(error);
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
