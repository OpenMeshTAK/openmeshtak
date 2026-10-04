import type { Event, DataPackage } from "../../generated/prisma/client.js";
import type { Permission } from "../../shared/auth/permissions.js";
import type { Principal } from "../../shared/auth/principal.js";
import { database } from "../../shared/database/database.js";
import { notFoundProblem } from "../../shared/errors/problem-error.js";
import { eventArchivedProblem, requireEventPermission } from "../events/event-access.js";

export interface DataPackageContext {
  event: Event;
  dataPackage: DataPackage;
}

/**
 * Loads a data package of an event after checking the event-scoped data package permission. Packages of
 * other events are concealed as `404`.
 */
export async function requireDataPackage(
  principal: Principal,
  eventId: string,
  packageId: string,
  permission: Permission,
): Promise<DataPackageContext> {
  const event = await requireEventPermission(principal, eventId, permission);
  const dataPackage = await database.dataPackage.findFirst({ where: { id: packageId, eventId } });
  if (dataPackage === null) {
    throw notFoundProblem();
  }
  return { event, dataPackage };
}

/** Archived events are a read-only record of what happened, including their data package content. */
export function requireEditableEvent(event: Event): void {
  if (event.status === "archived") {
    throw eventArchivedProblem();
  }
}
