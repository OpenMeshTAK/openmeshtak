import { randomUUID } from "node:crypto";
import { recordAudit } from "../../shared/audit/audit.js";
import type { ActorContext } from "../../shared/auth/principal.js";
import { database } from "../../shared/database/database.js";
import { notFoundProblem, versionConflictProblem } from "../../shared/errors/problem-error.js";
import { audienceSelectors, EMPTY_AUDIENCE, validateAudience } from "../event-audience/event-audience.js";
import { requireDataPackage, requireEditableEvent } from "./data-package-access.js";
import type { DataPackageDto, UpdatePackageAudienceRequest } from "./data-package.dto.js";
import { loadDto } from "./data-packages.service.js";

/**
 * Decides who receives the package's published revisions. Distribution is a publishing decision,
 * so it needs `data-packages.publish`, and it takes effect immediately for later downloads.
 */
export async function updatePackageAudience(
  actor: ActorContext,
  eventId: string,
  packageId: string,
  input: UpdatePackageAudienceRequest,
): Promise<DataPackageDto> {
  const { event, dataPackage } = await requireDataPackage(actor.principal, eventId, packageId, "data-packages.publish");
  requireEditableEvent(event);
  if (dataPackage.version !== input.version) {
    throw versionConflictProblem(dataPackage.version);
  }
  const { allMembers, ...selection } = input.audience;
  // A package for everyone keeps no selection, so switching back later starts empty and explicit.
  const stored = allMembers ? EMPTY_AUDIENCE : selection;
  await validateAudience(eventId, stored, "audience");

  await database.$transaction(async (transaction) => {
    const updated = await transaction.dataPackage.updateMany({
      where: { id: packageId, eventId, version: input.version },
      data: { audienceAll: allMembers, version: { increment: 1 } },
    });
    if (updated.count !== 1) {
      const latest = await transaction.dataPackage.findUnique({ where: { id: packageId }, select: { version: true } });
      throw latest === null ? notFoundProblem() : versionConflictProblem(latest.version);
    }
    await transaction.dataPackageAudience.deleteMany({ where: { packageId } });
    await transaction.dataPackageAudience.createMany({
      data: audienceSelectors(stored).map((target) => ({ id: randomUUID(), packageId, ...target })),
    });
    await recordAudit(
      {
        actor: actor.principal,
        action: "data-package.audience-updated",
        targetType: "data-package",
        targetId: packageId,
        result: "success",
        traceId: actor.traceId,
        metadata: {
          eventId,
          allMembers,
          groups: stored.groupIds.length,
          roles: stored.roleIds.length,
          members: stored.memberIds.length,
        },
      },
      transaction,
    );
  });
  return loadDto(packageId);
}
