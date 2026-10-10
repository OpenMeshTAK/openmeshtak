import type { Event } from "../../generated/prisma/client.js";
import {
  forbidden,
  hasAnyGrantForEvent,
  hasPermission,
  requirePermission,
} from "../../shared/auth/permission-check.js";
import type { Permission } from "../../shared/auth/permissions.js";
import type { Principal } from "../../shared/auth/principal.js";
import { database } from "../../shared/database/database.js";
import { notFoundProblem, ProblemError } from "../../shared/errors/problem-error.js";

export function eventArchivedProblem(): ProblemError {
  return new ProblemError({
    type: "urn:openmeshtak:problem:event-archived",
    title: "Event is archived",
    status: 409,
    detail: "Archived events are read-only. Reactivate the event before changing it.",
    code: "EVENT_ARCHIVED",
  });
}

/**
 * Callers without read access receive the same `404` as for a missing event, so event IDs
 * outside their scope cannot be discovered.
 */
export async function requireReadableEvent(principal: Principal, eventId: string): Promise<Event> {
  if (!(await hasPermission(principal, "events.read", eventId))) {
    throw notFoundProblem();
  }

  const event = await database.event.findUnique({ where: { id: eventId } });
  if (event === null) {
    throw notFoundProblem();
  }
  return event;
}

/**
 * Loads an event for an action guarded by an event-scoped permission other than `events.read`,
 * such as `members.sync`. Callers without any grant covering the event get a concealed `404`;
 * callers that know the event through another grant but lack this permission get `403`.
 */
export async function requireEventPermission(
  principal: Principal,
  eventId: string,
  permission: Permission,
): Promise<Event> {
  if (!(await hasPermission(principal, permission, eventId))) {
    if (await hasAnyGrantForEvent(principal, eventId)) {
      throw forbidden();
    }
    throw notFoundProblem();
  }

  const event = await database.event.findUnique({ where: { id: eventId } });
  if (event === null) {
    throw notFoundProblem();
  }
  return event;
}

/** Like `requireEventPermission`, for reads that any one of several permissions allows. */
export async function requireAnyEventPermission(
  principal: Principal,
  eventId: string,
  permissions: readonly Permission[],
): Promise<Event> {
  for (const permission of permissions) {
    if (await hasPermission(principal, permission, eventId)) {
      return requireEventPermission(principal, eventId, permission);
    }
  }
  return requireEventPermission(principal, eventId, permissions[0] as Permission);
}

/**
 * Event configuration may change only with the permission for that part of the event, such as
 * `tak-settings.manage`, and never once archived.
 */
export async function requireMutableEvent(
  principal: Principal,
  eventId: string,
  permission: Permission = "events.manage",
): Promise<Event> {
  const event = await requireReadableEvent(principal, eventId);
  await requirePermission(principal, permission, eventId);

  if (event.status === "archived") {
    throw eventArchivedProblem();
  }
  return event;
}
