import type { DataPackageKind } from "./data-package.dto.js";
import type { Prisma } from "../../generated/prisma/client.js";
import { ProblemError } from "../../shared/errors/problem-error.js";

/**
 * TAK apps address missions by name, so a mission name may be used only once per event. Data
 * Package names stay free.
 */
export async function requireUniqueMissionName(
  transaction: Pick<Prisma.TransactionClient, "dataPackage">,
  eventId: string,
  name: string,
  exceptId?: string,
): Promise<void> {
  const taken = await transaction.dataPackage.count({
    where: { eventId, kind: "mission", name, ...(exceptId === undefined ? {} : { id: { not: exceptId } }) },
  });
  if (taken > 0) {
    throw new ProblemError({
      type: "urn:openmeshtak:problem:mission-name-taken",
      title: "Mission name already in use",
      status: 409,
      detail: "Another mission of this event already uses this name. TAK apps find missions by name.",
      code: "MISSION_NAME_TAKEN",
    });
  }
}

/** New packages are drawn on top of the existing ones. */
export async function nextPackageSortOrder(
  transaction: Pick<Prisma.TransactionClient, "dataPackage">,
  eventId: string,
  kind: DataPackageKind = "package",
): Promise<number> {
  const highest = await transaction.dataPackage.aggregate({ where: { eventId, kind }, _max: { sortOrder: true } });
  return (highest._max.sortOrder ?? -1) + 1;
}
