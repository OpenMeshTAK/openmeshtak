import type { Event, MissionProject } from "../../generated/prisma/client.js";
import type { Permission } from "../../shared/auth/permissions.js";
import type { Principal } from "../../shared/auth/principal.js";
import { database } from "../../shared/database/database.js";
import { notFoundProblem } from "../../shared/errors/problem-error.js";
import { eventArchivedProblem, requireEventPermission } from "../events/event-access.js";

export interface MissionContext {
  event: Event;
  mission: MissionProject;
}

/**
 * Loads a mission of an event after checking the event-scoped mission permission. Missions of
 * other events are concealed as `404`.
 */
export async function requireMission(
  principal: Principal,
  eventId: string,
  missionId: string,
  permission: Permission,
): Promise<MissionContext> {
  const event = await requireEventPermission(principal, eventId, permission);
  const mission = await database.missionProject.findFirst({ where: { id: missionId, eventId } });
  if (mission === null) {
    throw notFoundProblem();
  }
  return { event, mission };
}

/** Archived events are read-only, including their mission content (PRODUCT.md). */
export function requireEditableEvent(event: Event): void {
  if (event.status === "archived") {
    throw eventArchivedProblem();
  }
}
