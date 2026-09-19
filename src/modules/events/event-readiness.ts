import type { Event } from "../../generated/prisma/client.js";
import { database } from "../../shared/database/database.js";
import { ProblemError, type ProblemFieldError } from "../../shared/errors/problem-error.js";
import { channelReadinessProblems } from "../meshtastic-channels/channel-readiness.js";
import { loadMeshtasticConfiguration } from "../meshtastic-configuration/current-configuration.js";

/**
 * Collects every unmet activation requirement at once so administrators can fix them together.
 * Activation, reactivation and publishing all require a ready configuration.
 */
export async function activationProblems(event: Pick<Event, "id">): Promise<ProblemFieldError[]> {
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
  problems.push(...(await channelReadinessProblems(event.id)));
  problems.push(...(await loadMeshtasticConfiguration(database, event.id)).problems);
  return problems;
}

export function notReady(errors: ProblemFieldError[]): ProblemError {
  return new ProblemError({
    type: "urn:openmeshtak:problem:event-not-ready",
    title: "Event is not ready",
    status: 409,
    detail: "The event does not meet the activation requirements yet.",
    code: "EVENT_NOT_READY",
    errors,
  });
}

