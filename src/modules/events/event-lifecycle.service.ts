import type { Event } from "../../generated/prisma/client.js";
import { recordAudit } from "../../shared/audit/audit.js";
import { requirePermission } from "../../shared/auth/permission-check.js";
import type { Permission } from "../../shared/auth/permissions.js";
import type { ActorContext } from "../../shared/auth/principal.js";
import { database } from "../../shared/database/database.js";
import {
  ProblemError,
  versionConflictProblem,
  type ProblemFieldError,
} from "../../shared/errors/problem-error.js";
import type { EventDto, EventStatus } from "./event.dto.js";
import { requireReadableEvent } from "./event-access.js";
import { toEventDto } from "./events.service.js";

interface Transition {
  from: EventStatus;
  to: EventStatus;
  permission: Permission;
  action: string;
  /** Activation and reactivation must prove the event is usable before participants see it. */
  validate: boolean;
}

/** The complete RC1 lifecycle. Anything not listed here is rejected. */
export const EVENT_TRANSITIONS = {
  activate: {
    from: "draft",
    to: "active",
    permission: "events.manage",
    action: "event.activated",
    validate: true,
  },
  archive: {
    from: "active",
    to: "archived",
    permission: "events.manage",
    action: "event.archived",
    validate: false,
  },
  reactivate: {
    from: "archived",
    to: "active",
    permission: "events.reactivate",
    action: "event.reactivated",
    validate: true,
  },
} as const satisfies Record<string, Transition>;

export type EventTransitionName = keyof typeof EVENT_TRANSITIONS;

function invalidTransition(current: EventStatus, transition: Transition): ProblemError {
  return new ProblemError({
    type: "urn:openmeshtak:problem:invalid-event-transition",
    title: "Invalid lifecycle transition",
    status: 409,
    detail: `An event in state "${current}" cannot move to "${transition.to}" this way.`,
    code: "INVALID_EVENT_TRANSITION",
  });
}

/**
 * Collects every unmet activation requirement at once so administrators can fix them together.
 * Provisioning-mapping checks join this list once those mappings exist.
 */
async function activationProblems(event: Event): Promise<ProblemFieldError[]> {
  const [roles, groups] = await Promise.all([
    database.eventRole.count({ where: { eventId: event.id } }),
    database.eventGroup.count({ where: { eventId: event.id } }),
  ]);

  const problems: ProblemFieldError[] = [];
  if (roles === 0) {
    problems.push({ field: "roles", code: "REQUIRED", message: "Add at least one event role." });
  }
  if (groups === 0) {
    problems.push({ field: "groups", code: "REQUIRED", message: "Add at least one event group." });
  }

  const groupsWithoutPrefix = await database.eventGroup.findMany({
    where: { eventId: event.id, shortNamePrefix: null },
    select: { slug: true },
    orderBy: { slug: "asc" },
  });
  for (const { slug } of groupsWithoutPrefix) {
    problems.push({
      field: `groups.${slug}.provisioning.shortNamePrefix`,
      code: "REQUIRED",
      message: "Choose a Meshtastic short-name prefix for this group.",
    });
  }
  return problems;
}

function notReady(errors: ProblemFieldError[]): ProblemError {
  return new ProblemError({
    type: "urn:openmeshtak:problem:event-not-ready",
    title: "Event is not ready",
    status: 409,
    detail: "The event does not meet the activation requirements yet.",
    code: "EVENT_NOT_READY",
    errors,
  });
}

/**
 * Applies one lifecycle transition with optimistic concurrency. Reactivation only flips the state;
 * it deliberately restores nothing that was revoked or expired while the event was archived.
 */
export async function transitionEvent(
  actor: ActorContext,
  eventId: string,
  name: EventTransitionName,
  expectedVersion: number,
): Promise<EventDto> {
  const transition: Transition = EVENT_TRANSITIONS[name];
  const event = await requireReadableEvent(actor.principal, eventId);
  await requirePermission(actor.principal, transition.permission, eventId);

  if (event.version !== expectedVersion) {
    throw versionConflictProblem(event.version);
  }
  if (event.status !== transition.from) {
    throw invalidTransition(event.status, transition);
  }
  if (transition.validate) {
    const problems = await activationProblems(event);
    if (problems.length > 0) {
      throw notReady(problems);
    }
  }

  await database.$transaction(async (transaction) => {
    const updated = await transaction.event.updateMany({
      where: { id: eventId, version: expectedVersion, status: transition.from },
      data: { status: transition.to, version: { increment: 1 } },
    });
    if (updated.count !== 1) {
      const latest = await transaction.event.findUniqueOrThrow({ where: { id: eventId } });
      throw latest.version !== expectedVersion
        ? versionConflictProblem(latest.version)
        : invalidTransition(latest.status, transition);
    }

    // Archiving invalidates outstanding participant claims. Reactivation never revives them.
    const revokedClaims =
      transition.to === "archived"
        ? (
            await transaction.memberClaim.updateMany({
              where: { eventId, consumedAt: null, revokedAt: null },
              data: { revokedAt: new Date() },
            })
          ).count
        : 0;

    await recordAudit(
      {
        actor: actor.principal,
        action: transition.action,
        targetType: "event",
        targetId: eventId,
        result: "success",
        traceId: actor.traceId,
        metadata: {
          previousStatus: transition.from,
          status: transition.to,
          ...(revokedClaims > 0 ? { revokedClaims } : {}),
        },
      },
      transaction,
    );
  });

  return toEventDto(await database.event.findUniqueOrThrow({ where: { id: eventId } }));
}
