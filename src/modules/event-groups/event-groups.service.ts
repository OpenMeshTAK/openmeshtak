import { randomUUID } from "node:crypto";
import type { EventGroup } from "../../generated/prisma/client.js";
import { recordAudit } from "../../shared/audit/audit.js";
import type { ActorContext, Principal } from "../../shared/auth/principal.js";
import { database } from "../../shared/database/database.js";
import { isUniqueConstraintError } from "../../shared/database/unique-constraint.js";
import {
  notFoundProblem,
  slugConflictProblem,
  versionConflictProblem,
} from "../../shared/errors/problem-error.js";
import {
  afterCursor,
  CURSOR_ORDER,
  DEFAULT_PAGE_LIMIT,
  decodeCursor,
  toPage,
} from "../../shared/pagination/cursor.js";
import { requireMutableEvent, requireReadableEvent } from "../events/event-access.js";
import type {
  CreateEventGroupRequest,
  EventGroupDto,
  EventGroupPage,
  UpdateEventGroupRequest,
} from "./event-group.dto.js";

function toDto(row: EventGroup): EventGroupDto {
  return {
    id: row.id,
    eventId: row.eventId,
    name: row.name,
    slug: row.slug,
    description: row.description,
    version: row.version,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function slugConflict(error: unknown): unknown {
  return isUniqueConstraintError(error)
    ? slugConflictProblem("Another group in this event already uses this slug.")
    : error;
}

async function findGroup(eventId: string, groupId: string): Promise<EventGroup> {
  const row = await database.eventGroup.findFirst({ where: { id: groupId, eventId } });
  if (row === null) {
    throw notFoundProblem();
  }
  return row;
}

function audit(actor: ActorContext, action: string, row: { id: string; eventId: string; slug: string }) {
  return {
    actor: actor.principal,
    action,
    targetType: "event-group",
    targetId: row.id,
    result: "success" as const,
    traceId: actor.traceId,
    metadata: { eventId: row.eventId, slug: row.slug },
  };
}

export async function listEventGroups(
  principal: Principal,
  eventId: string,
  limit = DEFAULT_PAGE_LIMIT,
  cursor?: string,
): Promise<EventGroupPage> {
  await requireReadableEvent(principal, eventId);
  const context = `events/${eventId}/groups`;
  const position = cursor === undefined ? null : decodeCursor(context, cursor);

  const rows = await database.eventGroup.findMany({
    where: { eventId, ...afterCursor(position) },
    orderBy: [...CURSOR_ORDER],
    take: limit + 1,
  });
  return toPage(context, rows, limit, toDto);
}

export async function getEventGroup(
  principal: Principal,
  eventId: string,
  groupId: string,
): Promise<EventGroupDto> {
  await requireReadableEvent(principal, eventId);
  return toDto(await findGroup(eventId, groupId));
}

export async function createEventGroup(
  actor: ActorContext,
  eventId: string,
  input: CreateEventGroupRequest,
): Promise<EventGroupDto> {
  await requireMutableEvent(actor.principal, eventId);

  try {
    return toDto(
      await database.$transaction(async (transaction) => {
        const row = await transaction.eventGroup.create({
          data: {
            id: randomUUID(),
            eventId,
            name: input.name,
            slug: input.slug,
            description: input.description ?? null,
          },
        });
        await recordAudit(audit(actor, "event-group.created", row), transaction);
        return row;
      }),
    );
  } catch (error: unknown) {
    throw slugConflict(error);
  }
}

export async function updateEventGroup(
  actor: ActorContext,
  eventId: string,
  groupId: string,
  input: UpdateEventGroupRequest,
): Promise<EventGroupDto> {
  await requireMutableEvent(actor.principal, eventId);
  const current = await findGroup(eventId, groupId);
  if (current.version !== input.version) {
    throw versionConflictProblem(current.version);
  }

  try {
    await database.$transaction(async (transaction) => {
      const updated = await transaction.eventGroup.updateMany({
        where: { id: groupId, eventId, version: input.version },
        data: {
          name: input.name,
          slug: input.slug,
          description: input.description,
          version: { increment: 1 },
        },
      });
      if (updated.count !== 1) {
        const latest = await transaction.eventGroup.findUnique({ where: { id: groupId } });
        throw latest === null ? notFoundProblem() : versionConflictProblem(latest.version);
      }
      await recordAudit(audit(actor, "event-group.updated", { ...current, slug: input.slug }), transaction);
    });
  } catch (error: unknown) {
    throw slugConflict(error);
  }

  return toDto(await findGroup(eventId, groupId));
}

/** Members will block deletion once memberships exist; until then a group can always be removed. */
export async function deleteEventGroup(
  actor: ActorContext,
  eventId: string,
  groupId: string,
): Promise<void> {
  await requireMutableEvent(actor.principal, eventId);
  const current = await findGroup(eventId, groupId);

  await database.$transaction(async (transaction) => {
    await transaction.eventGroup.delete({ where: { id: current.id } });
    await recordAudit(audit(actor, "event-group.deleted", current), transaction);
  });
}
