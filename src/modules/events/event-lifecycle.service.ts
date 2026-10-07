import { recordAudit } from "../../shared/audit/audit.js";
import { requirePermission } from "../../shared/auth/permission-check.js";
import type { Permission } from "../../shared/auth/permissions.js";
import type { ActorContext } from "../../shared/auth/principal.js";
import { database } from "../../shared/database/database.js";
import { ProblemError, versionConflictProblem } from "../../shared/errors/problem-error.js";
import type { EventDto, EventStatus } from "./event.dto.js";
import { requireReadableEvent } from "./event-access.js";
import { activationProblems, notReady } from "./event-readiness.js";
import { toEventDto } from "./events.service.js";
import { createConfigurationRevision } from "../event-configuration/configuration-revisions.service.js";
import { endEventAccounts } from "../users/event-accounts.js";

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

    // Activation and reactivation freeze the validated configuration for profiles and artifacts.
    if (transition.to === "active") {
      await createConfigurationRevision(
        transaction,
        actor,
        eventId,
        name === "activate" ? "activation" : "reactivation",
      );
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

    // Event accounts end with their event; reactivation does not bring them back.
    const accounts = transition.to === "archived" ? await endEventAccounts(transaction, eventId) : { deleted: 0, moved: 0 };

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
          ...(accounts.deleted > 0 ? { deletedAccounts: accounts.deleted } : {}),
          ...(accounts.moved > 0 ? { movedAccounts: accounts.moved } : {}),
        },
      },
      transaction,
    );
  });

  return toEventDto(await database.event.findUniqueOrThrow({ where: { id: eventId } }));
}
