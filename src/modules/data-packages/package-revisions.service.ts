import { randomUUID } from "node:crypto";
import type { PackageRevision, Prisma } from "../../generated/prisma/client.js";
import { recordAudit } from "../../shared/audit/audit.js";
import type { ActorContext, Principal } from "../../shared/auth/principal.js";
import { database } from "../../shared/database/database.js";
import { notFoundProblem } from "../../shared/errors/problem-error.js";
import {
  afterCursor,
  CURSOR_ORDER,
  DEFAULT_PAGE_LIMIT,
  decodeCursor,
  toPage,
} from "../../shared/pagination/cursor.js";
import { requireEditableEvent, requireDataPackage } from "./data-package-access.js";
import type {
  PackageRevisionDto,
  PackageRevisionPage,
  PackageRevisionSummaryDto,
  PublishDataPackageResponse,
} from "./package-revision.dto.js";
import { estimateAtakExportSize } from "./package-export-size.js";
import { announceRevisionCreated } from "./package-revision-events.js";
import { buildPackageSnapshot, hashPackageSnapshot, type PackageSnapshot } from "./package-snapshot.js";

function toSummary(row: PackageRevision): PackageRevisionSummaryDto {
  return {
    id: row.id,
    packageId: row.packageId,
    number: row.number,
    snapshotHash: row.snapshotHash,
    createdAt: row.createdAt.toISOString(),
  };
}

function toDto(row: PackageRevision): PackageRevisionDto {
  // Revisions are written only by `publishDataPackage` from `PackageSnapshot` values.
  return { ...toSummary(row), snapshot: row.snapshot as unknown as PackageSnapshot };
}

/**
 * Freezes the current draft as the next immutable revision. Publishing an unchanged draft returns
 * the latest revision instead of a duplicate. Requires `data-packages.publish`.
 */
export async function publishDataPackage(
  actor: ActorContext,
  eventId: string,
  packageId: string,
): Promise<PublishDataPackageResponse> {
  const { event } = await requireDataPackage(actor.principal, eventId, packageId, "data-packages.publish");
  requireEditableEvent(event);

  const result = await database.$transaction(async (transaction) => {
    const snapshot = await buildPackageSnapshot(transaction, packageId);
    const snapshotHash = hashPackageSnapshot(snapshot);
    const latest = await transaction.packageRevision.findFirst({
      where: { packageId },
      orderBy: { number: "desc" },
    });
    // Refreshes the list's cached draft hash without counting as an edit.
    const { updatedAt } = await transaction.dataPackage.findUniqueOrThrow({ where: { id: packageId }, select: { updatedAt: true } });
    await transaction.dataPackage.update({ where: { id: packageId }, data: { draftHash: snapshotHash, updatedAt } });
    if (latest?.snapshotHash === snapshotHash) {
      return { created: false, revision: toDto(latest) };
    }

    const createdAt = new Date();
    const revision = await transaction.packageRevision.create({
      data: {
        id: randomUUID(),
        packageId,
        number: (latest?.number ?? 0) + 1,
        snapshot: snapshot as unknown as Prisma.InputJsonObject,
        snapshotHash,
        exportSize: estimateAtakExportSize(snapshot, createdAt),
        createdAt,
        createdByType: actor.principal.type,
        createdById: actor.principal.id,
      },
    });
    await recordAudit(
      {
        actor: actor.principal,
        action: "data-package.published",
        targetType: "data-package-revision",
        targetId: revision.id,
        result: "success",
        traceId: actor.traceId,
        metadata: { eventId, packageId, number: revision.number },
      },
      transaction,
    );
    return { created: true, revision: toDto(revision) };
  });
  if (result.created) {
    announceRevisionCreated(packageId);
  }
  return result;
}

export async function listRevisions(
  principal: Principal,
  eventId: string,
  packageId: string,
  limit = DEFAULT_PAGE_LIMIT,
  cursor?: string,
): Promise<PackageRevisionPage> {
  await requireDataPackage(principal, eventId, packageId, "data-packages.read");
  const context = `data-packages/${packageId}/revisions`;
  const position = cursor === undefined ? null : decodeCursor(context, cursor);

  const rows = await database.packageRevision.findMany({
    where: { packageId, ...afterCursor(position) },
    orderBy: [...CURSOR_ORDER],
    take: limit + 1,
  });
  return toPage(context, rows, limit, toSummary);
}

export async function getRevision(
  principal: Principal,
  eventId: string,
  packageId: string,
  number: number,
): Promise<PackageRevisionDto> {
  await requireDataPackage(principal, eventId, packageId, "data-packages.read");
  const row = await database.packageRevision.findUnique({ where: { packageId_number: { packageId, number } } });
  if (row === null) {
    throw notFoundProblem();
  }
  return toDto(row);
}
