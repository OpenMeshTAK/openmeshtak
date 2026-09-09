import type { Event } from "../../generated/prisma/client.js";
import { hasPermission, requirePermission } from "../../shared/auth/permission-check.js";
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

/** Event configuration may change only with `events.manage` and never once archived. */
export async function requireMutableEvent(principal: Principal, eventId: string): Promise<Event> {
  const event = await requireReadableEvent(principal, eventId);
  await requirePermission(principal, "events.manage", eventId);

  if (event.status === "archived") {
    throw eventArchivedProblem();
  }
  return event;
}
