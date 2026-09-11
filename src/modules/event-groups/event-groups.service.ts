import { randomUUID } from "node:crypto";
import type { EventGroup } from "../../generated/prisma/client.js";
import { recordAudit } from "../../shared/audit/audit.js";
import type { ActorContext, Principal } from "../../shared/auth/principal.js";
import { database } from "../../shared/database/database.js";
import { isUniqueConstraintError } from "../../shared/database/unique-constraint.js";
import {
  notFoundProblem,
  ProblemError,
  slugConflictProblem,
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
import { refreshGroupMemberIdentities } from "../event-members/group-identity-refresh.js";
import { requireMutableEvent, requireReadableEvent } from "../events/event-access.js";
import type {
  CreateEventGroupRequest,
  EventGroupDto,
  EventGroupPage,
  UpdateEventGroupRequest,
} from "./event-group.dto.js";
import {
  defaultProvisioning,
  provisioningProblems,
  toGroupProvisioning,
  toProvisioningColumns,
  type GroupProvisioning,
} from "./group-provisioning.js";

function toDto(row: EventGroup): EventGroupDto {
  return {
    id: row.id,
    eventId: row.eventId,
    name: row.name,
    slug: row.slug,
    description: row.description,
    provisioning: toGroupProvisioning(row),
    version: row.version,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function prefixConflict(): ProblemError {
  return new ProblemError({
    type: "urn:openmeshtak:problem:short-name-prefix-conflict",
    title: "Short-name prefix already in use",
    status: 409,
    detail: "Another group in this event already uses this Meshtastic short-name prefix.",
    code: "SHORT_NAME_PREFIX_CONFLICT",
  });
}

async function prefixTaken(eventId: string, prefix: string, exceptGroupId?: string): Promise<boolean> {
  const other = await database.eventGroup.findFirst({
    where: { eventId, shortNamePrefix: prefix, ...(exceptGroupId === undefined ? {} : { NOT: { id: exceptGroupId } }) },
    select: { id: true },
  });
  return other !== null;
}

function validateProvisioning(provisioning: GroupProvisioning): void {
  const problems = provisioningProblems(provisioning);
  if (problems.length > 0) {
    throw validationProblem(problems);
  }
}

/**
 * Without explicit settings a group gets defaults. The default prefix is the first slug letter;
 * when another group already uses it (Bravo and Blue) the prefix stays unset for the
 * administrator to choose instead of failing the creation.
 */
async function provisioningForCreate(
  eventId: string,
  input: CreateEventGroupRequest,
): Promise<GroupProvisioning> {
  if (input.provisioning !== undefined) {
    validateProvisioning(input.provisioning);
    const prefix = input.provisioning.shortNamePrefix;
    if (prefix !== null && (await prefixTaken(eventId, prefix))) {
      throw prefixConflict();
    }
    return input.provisioning;
  }

  const defaults = defaultProvisioning(input.slug);
  const prefix = defaults.shortNamePrefix;
  return prefix !== null && (await prefixTaken(eventId, prefix))
    ? { ...defaults, shortNamePrefix: null }
    : defaults;
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
  const provisioning = await provisioningForCreate(eventId, input);

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
            ...toProvisioningColumns(provisioning),
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
  validateProvisioning(input.provisioning);
  const prefix = input.provisioning.shortNamePrefix;
  if (prefix !== null && (await prefixTaken(eventId, prefix, groupId))) {
    throw prefixConflict();
  }

  try {
    await database.$transaction(async (transaction) => {
      const updated = await transaction.eventGroup.updateMany({
        where: { id: groupId, eventId, version: input.version },
        data: {
          name: input.name,
          slug: input.slug,
          description: input.description,
          ...toProvisioningColumns(input.provisioning),
          version: { increment: 1 },
        },
      });
      if (updated.count !== 1) {
        const latest = await transaction.eventGroup.findUnique({ where: { id: groupId } });
        throw latest === null ? notFoundProblem() : versionConflictProblem(latest.version);
      }
      await refreshGroupMemberIdentities(transaction, {
        id: groupId,
        eventId,
        name: input.name,
        callsignFormat: input.provisioning.callsignFormat,
        shortNamePrefix: input.provisioning.shortNamePrefix,
      });
      await recordAudit(audit(actor, "event-group.updated", { ...current, slug: input.slug }), transaction);
    });
  } catch (error: unknown) {
    throw slugConflict(error);
  }

  return toDto(await findGroup(eventId, groupId));
}

/** A group that is still assigned to members cannot be deleted. */
export async function deleteEventGroup(
  actor: ActorContext,
  eventId: string,
  groupId: string,
): Promise<void> {
  await requireMutableEvent(actor.principal, eventId);
  const current = await findGroup(eventId, groupId);

  await database.$transaction(async (transaction) => {
    // Counted inside the transaction; the restrictive foreign key is the final safeguard.
    if ((await transaction.eventMember.count({ where: { eventGroupId: current.id } })) > 0) {
      throw new ProblemError({
        type: "urn:openmeshtak:problem:group-in-use",
        title: "Group is still assigned",
        status: 409,
        detail: "Reassign the members of this group before deleting it.",
        code: "GROUP_IN_USE",
      });
    }
    await transaction.eventGroup.delete({ where: { id: current.id } });
    await recordAudit(audit(actor, "event-group.deleted", current), transaction);
  });
}
