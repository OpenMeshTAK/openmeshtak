import { randomUUID } from "node:crypto";
import type { Prisma, TakGroup, TakGroupMembership } from "../../generated/prisma/client.js";
import { recordAudit } from "../../shared/audit/audit.js";
import type { ActorContext, Principal } from "../../shared/auth/principal.js";
import { database } from "../../shared/database/database.js";
import { isUniqueConstraintError } from "../../shared/database/unique-constraint.js";
import { notFoundProblem, ProblemError, validationProblem, versionConflictProblem } from "../../shared/errors/problem-error.js";
import { afterCursor, CURSOR_ORDER, DEFAULT_PAGE_LIMIT, decodeCursor, toPage } from "../../shared/pagination/cursor.js";
import { requireMutableEvent, requireReadableEvent } from "../events/event-access.js";
import type {
  CreateTakGroupRequest,
  TakGroupDto,
  TakGroupMemberDto,
  TakGroupPage,
  TakGroupSummaryDto,
  UpdateTakGroupRequest,
} from "./tak-group.dto.js";

type GroupRow = TakGroup & { members: TakGroupMembership[] };

function toSummary(row: GroupRow): TakGroupSummaryDto {
  return {
    id: row.id,
    eventId: row.eventId,
    name: row.name,
    description: row.description,
    receiverCount: row.members.filter(({ receive }) => receive).length,
    senderCount: row.members.filter(({ send }) => send).length,
    version: row.version,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function toDto(row: GroupRow): TakGroupDto {
  return {
    ...toSummary(row),
    members: row.members
      .map(({ memberId, receive, send }) => ({ memberId, receive, send }))
      .sort((a, b) => a.memberId.localeCompare(b.memberId)),
  };
}

function nameTaken(error: unknown): unknown {
  return isUniqueConstraintError(error)
    ? new ProblemError({
        type: "urn:openmeshtak:problem:tak-group-name-taken",
        title: "TAK group name already in use",
        status: 409,
        detail: "Another TAK group of this event already uses this name.",
        code: "TAK_GROUP_NAME_TAKEN",
      })
    : error;
}

function audit(actor: ActorContext, action: string, row: { id: string; eventId: string; name: string }, memberCount?: number) {
  return {
    actor: actor.principal,
    action,
    targetType: "tak-group",
    targetId: row.id,
    result: "success" as const,
    traceId: actor.traceId,
    metadata: { eventId: row.eventId, name: row.name, ...(memberCount === undefined ? {} : { memberCount }) },
  };
}

async function findGroup(eventId: string, groupId: string): Promise<GroupRow> {
  const row = await database.takGroup.findFirst({ where: { id: groupId, eventId }, include: { members: true } });
  if (row === null) {
    throw notFoundProblem();
  }
  return row;
}

/** Members must belong to the event; entries without any direction are dropped. */
async function validatedMembers(eventId: string, members: TakGroupMemberDto[]): Promise<TakGroupMemberDto[]> {
  const kept = members.filter(({ receive, send }) => receive || send);
  const ids = [...new Set(kept.map(({ memberId }) => memberId))];
  if (ids.length !== kept.length) {
    throw validationProblem([{ field: "members", code: "DUPLICATE", message: "Each member may appear only once." }]);
  }
  const found = await database.eventMember.count({ where: { eventId, id: { in: ids } } });
  if (found !== ids.length) {
    throw validationProblem([{ field: "members", code: "UNKNOWN_REFERENCE", message: "Choose members of this event." }]);
  }
  return kept;
}

async function replaceMembers(transaction: Prisma.TransactionClient, groupId: string, members: TakGroupMemberDto[]): Promise<void> {
  await transaction.takGroupMembership.deleteMany({ where: { groupId } });
  await transaction.takGroupMembership.createMany({ data: members.map((member) => ({ groupId, ...member })) });
}

export async function listTakGroups(principal: Principal, eventId: string, limit = DEFAULT_PAGE_LIMIT, cursor?: string): Promise<TakGroupPage> {
  await requireReadableEvent(principal, eventId);
  const context = `events/${eventId}/tak/groups`;
  const position = cursor === undefined ? null : decodeCursor(context, cursor);
  const rows = await database.takGroup.findMany({
    where: { eventId, ...afterCursor(position) },
    orderBy: [...CURSOR_ORDER],
    take: limit + 1,
    include: { members: true },
  });
  return toPage(context, rows, limit, toSummary);
}

export async function getTakGroup(principal: Principal, eventId: string, groupId: string): Promise<TakGroupDto> {
  await requireReadableEvent(principal, eventId);
  return toDto(await findGroup(eventId, groupId));
}

export async function createTakGroup(actor: ActorContext, eventId: string, input: CreateTakGroupRequest): Promise<TakGroupDto> {
  await requireMutableEvent(actor.principal, eventId);
  const members = await validatedMembers(eventId, input.members ?? []);
  try {
    const id = await database.$transaction(async (transaction) => {
      const row = await transaction.takGroup.create({
        data: { id: randomUUID(), eventId, name: input.name.trim(), description: input.description ?? null },
      });
      await replaceMembers(transaction, row.id, members);
      await recordAudit(audit(actor, "tak-group.created", row, members.length), transaction);
      return row.id;
    });
    return toDto(await findGroup(eventId, id));
  } catch (error: unknown) {
    throw nameTaken(error);
  }
}

/** Changes apply to connected TAK apps within the access recheck, without publishing. */
export async function updateTakGroup(actor: ActorContext, eventId: string, groupId: string, input: UpdateTakGroupRequest): Promise<TakGroupDto> {
  await requireMutableEvent(actor.principal, eventId);
  const current = await findGroup(eventId, groupId);
  if (current.version !== input.version) {
    throw versionConflictProblem(current.version);
  }
  const members = input.members === undefined ? null : await validatedMembers(eventId, input.members);
  try {
    await database.$transaction(async (transaction) => {
      const updated = await transaction.takGroup.updateMany({
        where: { id: groupId, eventId, version: input.version },
        data: { name: input.name.trim(), description: input.description, version: { increment: 1 } },
      });
      if (updated.count !== 1) {
        const latest = await transaction.takGroup.findUnique({ where: { id: groupId } });
        throw versionConflictProblem(latest?.version ?? 0);
      }
      if (members !== null) {
        await replaceMembers(transaction, groupId, members);
      }
      await recordAudit(audit(actor, "tak-group.updated", { ...current, name: input.name }, members?.length), transaction);
    });
  } catch (error: unknown) {
    throw nameTaken(error);
  }
  return toDto(await findGroup(eventId, groupId));
}

export async function deleteTakGroup(actor: ActorContext, eventId: string, groupId: string): Promise<void> {
  await requireMutableEvent(actor.principal, eventId);
  const current = await findGroup(eventId, groupId);
  await database.$transaction(async (transaction) => {
    await transaction.takGroup.delete({ where: { id: current.id } });
    await recordAudit(audit(actor, "tak-group.deleted", current, current.members.length), transaction);
  });
}
