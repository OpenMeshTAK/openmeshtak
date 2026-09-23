import { recordAudit } from "../../shared/audit/audit.js";
import type { ActorContext } from "../../shared/auth/principal.js";
import { database } from "../../shared/database/database.js";
import { ProblemError } from "../../shared/errors/problem-error.js";
import { requireEventPermission } from "../events/event-access.js";
import { requireEditableEvent } from "./data-package-access.js";
import type { DataPackageDto } from "./data-package.dto.js";
import { listDataPackages } from "./data-packages.service.js";

export interface ReorderDataPackagesRequest {
  /**
   * Every data package of the event, bottom first; the last one is drawn on top.
   * @maxItems 500
   */
  packageIds: string[];
}

function staleOrderProblem(): ProblemError {
  return new ProblemError({
    type: "urn:openmeshtak:problem:stale-package-order",
    title: "Data packages changed",
    status: 409,
    detail: "Data packages were added or removed meanwhile. Reload the list and reorder again.",
    code: "STALE_PACKAGE_ORDER",
  });
}

/**
 * Sets the drawing order of all data packages of an event at once. The list must name exactly
 * the current packages, so a package created meanwhile is never silently pushed somewhere.
 * Package versions stay unchanged: reordering never conflicts with someone editing content.
 */
export async function reorderDataPackages(
  actor: ActorContext,
  eventId: string,
  input: ReorderDataPackagesRequest,
): Promise<DataPackageDto[]> {
  requireEditableEvent(await requireEventPermission(actor.principal, eventId, "data-packages.edit"));

  await database.$transaction(async (transaction) => {
    const current = await transaction.dataPackage.findMany({ where: { eventId }, select: { id: true } });
    const known = new Set(current.map(({ id }) => id));
    if (input.packageIds.length !== known.size || new Set(input.packageIds).size !== known.size || input.packageIds.some((id) => !known.has(id))) {
      throw staleOrderProblem();
    }
    for (const [sortOrder, id] of input.packageIds.entries()) {
      await transaction.dataPackage.update({ where: { id }, data: { sortOrder } });
    }
    await recordAudit(
      {
        actor: actor.principal,
        action: "data-package.reordered",
        targetType: "event",
        targetId: eventId,
        result: "success",
        traceId: actor.traceId,
        metadata: { packages: input.packageIds.length },
      },
      transaction,
    );
  });
  return (await listDataPackages(actor.principal, eventId, 100)).items;
}
