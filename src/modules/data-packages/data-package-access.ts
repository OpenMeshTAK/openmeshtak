import type { Event, DataPackage } from "../../generated/prisma/client.js";
import { hasPermission } from "../../shared/auth/permission-check.js";
import type { Permission } from "../../shared/auth/permissions.js";
import type { Principal } from "../../shared/auth/principal.js";
import { database } from "../../shared/database/database.js";
import { notFoundProblem } from "../../shared/errors/problem-error.js";
import { eventArchivedProblem, requireAnyEventPermission, requireEventPermission } from "../events/event-access.js";
import type { DataPackageKind } from "./data-package.dto.js";

export interface DataPackageContext {
  event: Event;
  dataPackage: DataPackage;
}

/** Callers name the Data Package action; missions check the matching `missions.*` permission. */
export type PackagePermission = "data-packages.read" | "data-packages.edit" | "data-packages.publish";

const MISSION_PERMISSIONS: Record<PackagePermission, Permission> = {
  "data-packages.read": "missions.read",
  "data-packages.edit": "missions.edit",
  "data-packages.publish": "missions.publish",
};

export function permissionForKind(permission: PackagePermission, kind: string): Permission {
  return kind === "mission" ? MISSION_PERMISSIONS[permission] : permission;
}

/** Checks the event-scoped permission for one kind of package, e.g. creating a mission. */
export function requireKindPermission(
  principal: Principal,
  eventId: string,
  permission: PackagePermission,
  kind: string,
): Promise<Event> {
  return requireEventPermission(principal, eventId, permissionForKind(permission, kind));
}

/** For views that combine both kinds, such as the editor: either read permission opens them. */
export function requireAnyPackageRead(principal: Principal, eventId: string): Promise<Event> {
  return requireAnyEventPermission(principal, eventId, ["data-packages.read", "missions.read"]);
}

/** The kinds a caller may list in an event; at least one, or a concealed `404`/`403`. */
export async function readableKinds(principal: Principal, eventId: string): Promise<DataPackageKind[]> {
  await requireAnyPackageRead(principal, eventId);
  const kinds: DataPackageKind[] = [];
  if (await hasPermission(principal, "data-packages.read", eventId)) kinds.push("package");
  if (await hasPermission(principal, "missions.read", eventId)) kinds.push("mission");
  return kinds;
}

/**
 * Loads a data package of an event after checking the event-scoped permission for its kind. Packages
 * of other events are concealed as `404`.
 */
export async function requireDataPackage(
  principal: Principal,
  eventId: string,
  packageId: string,
  permission: PackagePermission,
): Promise<DataPackageContext> {
  const dataPackage = await database.dataPackage.findFirst({ where: { id: packageId, eventId } });
  if (dataPackage === null) {
    // Permission errors come first so callers without access cannot probe package IDs.
    await requireAnyEventPermission(principal, eventId, [permission, MISSION_PERMISSIONS[permission]]);
    throw notFoundProblem();
  }
  const event = await requireEventPermission(principal, eventId, permissionForKind(permission, dataPackage.kind));
  return { event, dataPackage };
}

/** Archived events are a read-only record of what happened, including their data package content. */
export function requireEditableEvent(event: Event): void {
  if (event.status === "archived") {
    throw eventArchivedProblem();
  }
}
