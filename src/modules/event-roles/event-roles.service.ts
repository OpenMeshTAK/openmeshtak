import { randomUUID } from "node:crypto";
import type { EventRole } from "../../generated/prisma/client.js";
import { recordAudit } from "../../shared/audit/audit.js";
import type { ActorContext, Principal } from "../../shared/auth/principal.js";
import { database } from "../../shared/database/database.js";
import { isUniqueConstraintError } from "../../shared/database/unique-constraint.js";
import {
  notFoundProblem,
  ProblemError,
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
import type { TakRole } from "../event-groups/provisioning-values.js";
import { requireMutableEvent, requireReadableEvent } from "../events/event-access.js";
import type {
  CreateEventRoleRequest,
  EventRoleDto,
  EventRolePage,
  UpdateEventRoleRequest,
} from "./event-role.dto.js";

function toDto(row: EventRole): EventRoleDto {
  return {
    id: row.id,
    eventId: row.eventId,
    name: row.name,
    slug: row.slug,
    description: row.description,
    takRoleOverride: row.takRoleOverride as TakRole | null,
    seesAllTakGroups: row.seesAllTakGroups,
    version: row.version,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function slugConflict(error: unknown): unknown {
  return isUniqueConstraintError(error)
    ? slugConflictProblem("Another role in this event already uses this slug.")
    : error;
}

async function findRole(eventId: string, roleId: string): Promise<EventRole> {
  const row = await database.eventRole.findFirst({ where: { id: roleId, eventId } });
  if (row === null) {
    throw notFoundProblem();
  }
  return row;
}

function audit(actor: ActorContext, action: string, row: { id: string; eventId: string; slug: string }) {
  return {
    actor: actor.principal,
    action,
    targetType: "event-role",
    targetId: row.id,
    result: "success" as const,
    traceId: actor.traceId,
    metadata: { eventId: row.eventId, slug: row.slug },
  };
}

export async function listEventRoles(
  principal: Principal,
  eventId: string,
  limit = DEFAULT_PAGE_LIMIT,
  cursor?: string,
): Promise<EventRolePage> {
  await requireReadableEvent(principal, eventId);
  const context = `events/${eventId}/roles`;
  const position = cursor === undefined ? null : decodeCursor(context, cursor);

  const rows = await database.eventRole.findMany({
    where: { eventId, ...afterCursor(position) },
    orderBy: [...CURSOR_ORDER],
    take: limit + 1,
  });
  return toPage(context, rows, limit, toDto);
}

export async function getEventRole(
  principal: Principal,
  eventId: string,
  roleId: string,
): Promise<EventRoleDto> {
  await requireReadableEvent(principal, eventId);
  return toDto(await findRole(eventId, roleId));
}

export async function createEventRole(
  actor: ActorContext,
  eventId: string,
  input: CreateEventRoleRequest,
): Promise<EventRoleDto> {
  await requireMutableEvent(actor.principal, eventId, "event-roles.manage");

  try {
    return toDto(
      await database.$transaction(async (transaction) => {
        const row = await transaction.eventRole.create({
          data: {
            id: randomUUID(),
            eventId,
            name: input.name,
            slug: input.slug,
            description: input.description ?? null,
            takRoleOverride: input.takRoleOverride ?? null,
            seesAllTakGroups: input.seesAllTakGroups ?? false,
          },
        });
        await recordAudit(audit(actor, "event-role.created", row), transaction);
        return row;
      }),
    );
  } catch (error: unknown) {
    throw slugConflict(error);
  }
}

export async function updateEventRole(
  actor: ActorContext,
  eventId: string,
  roleId: string,
  input: UpdateEventRoleRequest,
): Promise<EventRoleDto> {
  await requireMutableEvent(actor.principal, eventId, "event-roles.manage");
  const current = await findRole(eventId, roleId);
  if (current.version !== input.version) {
    throw versionConflictProblem(current.version);
  }

  try {
    await database.$transaction(async (transaction) => {
      const updated = await transaction.eventRole.updateMany({
        where: { id: roleId, eventId, version: input.version },
        data: {
          name: input.name,
          slug: input.slug,
          description: input.description,
          ...(input.takRoleOverride === undefined ? {} : { takRoleOverride: input.takRoleOverride }),
          ...(input.seesAllTakGroups === undefined ? {} : { seesAllTakGroups: input.seesAllTakGroups }),
          version: { increment: 1 },
        },
      });
      if (updated.count !== 1) {
        const latest = await transaction.eventRole.findUnique({ where: { id: roleId } });
        throw latest === null ? notFoundProblem() : versionConflictProblem(latest.version);
      }
      await recordAudit(audit(actor, "event-role.updated", { ...current, slug: input.slug }), transaction);
    });
  } catch (error: unknown) {
    throw slugConflict(error);
  }

  return toDto(await findRole(eventId, roleId));
}

/** A role that is still assigned to members cannot be deleted. */
export async function deleteEventRole(
  actor: ActorContext,
  eventId: string,
  roleId: string,
): Promise<void> {
  await requireMutableEvent(actor.principal, eventId, "event-roles.manage");
  const current = await findRole(eventId, roleId);

  await database.$transaction(async (transaction) => {
    // Counted inside the transaction; the restrictive foreign key is the final safeguard.
    if ((await transaction.eventMember.count({ where: { eventRoleId: current.id } })) > 0) {
      throw new ProblemError({
        type: "urn:openmeshtak:problem:role-in-use",
        title: "Role is still assigned",
        status: 409,
        detail: "Reassign the members of this role before deleting it.",
        code: "ROLE_IN_USE",
      });
    }
    await transaction.eventRole.delete({ where: { id: current.id } });
    await recordAudit(audit(actor, "event-role.deleted", current), transaction);
  });
}
