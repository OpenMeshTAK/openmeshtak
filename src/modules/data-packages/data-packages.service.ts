import { randomUUID } from "node:crypto";
import type { Prisma } from "../../generated/prisma/client.js";
import { recordAudit } from "../../shared/audit/audit.js";
import type { ActorContext, Principal } from "../../shared/auth/principal.js";
import { database } from "../../shared/database/database.js";
import { notFoundProblem, versionConflictProblem } from "../../shared/errors/problem-error.js";
import {
  afterCursor,
  CURSOR_ORDER,
  DEFAULT_PAGE_LIMIT,
  decodeCursor,
  toPage,
} from "../../shared/pagination/cursor.js";
import { audienceFromSelectors } from "../event-audience/event-audience.js";
import { requireEventPermission } from "../events/event-access.js";
import type { CreateDataPackageRequest, DataPackageDto, DataPackagePage, UpdateDataPackageRequest } from "./data-package.dto.js";
import { requireEditableEvent, requireDataPackage } from "./data-package-access.js";

const packageSelection = {
  id: true,
  eventId: true,
  name: true,
  description: true,
  version: true,
  audienceAll: true,
  audience: true,
  createdAt: true,
  updatedAt: true,
  revisions: { select: { number: true }, orderBy: { number: "desc" }, take: 1 },
  sources: { orderBy: [{ createdAt: "asc" }, { id: "asc" }] },
} satisfies Prisma.DataPackageSelect;

type PackageRow = Prisma.DataPackageGetPayload<{ select: typeof packageSelection }>;

function toDto(row: PackageRow): DataPackageDto {
  return {
    id: row.id,
    eventId: row.eventId,
    name: row.name,
    description: row.description,
    latestRevision: row.revisions[0]?.number ?? null,
    sources: row.sources.map((source) => ({
      id: source.id,
      sourcePackageId: source.sourcePackageId,
      sourcePackageName: source.sourcePackageName,
      sourceRevision: source.sourceRevision,
      sourceSnapshotHash: source.sourceSnapshotHash,
      // Written only by the package-copy service from UUIDs selected in a validated snapshot.
      sourceLayerIds: source.sourceLayerIds as string[],
      createdAt: source.createdAt.toISOString(),
    })),
    audience: { allMembers: row.audienceAll, ...audienceFromSelectors(row.audience) },
    version: row.version,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function loadDto(packageId: string): Promise<DataPackageDto> {
  return toDto(
    await database.dataPackage.findUniqueOrThrow({ where: { id: packageId }, select: packageSelection }),
  );
}

function audit(actor: ActorContext, action: string, packageId: string, eventId: string) {
  return {
    actor: actor.principal,
    action,
    targetType: "data-package",
    targetId: packageId,
    result: "success" as const,
    traceId: actor.traceId,
    metadata: { eventId },
  };
}

export async function listDataPackages(
  principal: Principal,
  eventId: string,
  limit = DEFAULT_PAGE_LIMIT,
  cursor?: string,
): Promise<DataPackagePage> {
  await requireEventPermission(principal, eventId, "data-packages.read");
  const context = `events/${eventId}/data-packages`;
  const position = cursor === undefined ? null : decodeCursor(context, cursor);

  const rows = await database.dataPackage.findMany({
    where: { eventId, ...afterCursor(position) },
    orderBy: [...CURSOR_ORDER],
    take: limit + 1,
    select: packageSelection,
  });
  return toPage(context, rows, limit, toDto);
}

export async function getDataPackage(principal: Principal, eventId: string, packageId: string): Promise<DataPackageDto> {
  await requireDataPackage(principal, eventId, packageId, "data-packages.read");
  return loadDto(packageId);
}

/** New data packages start with one empty layer so the editor can draw immediately. */
export async function createDataPackage(
  actor: ActorContext,
  eventId: string,
  input: CreateDataPackageRequest,
): Promise<DataPackageDto> {
  requireEditableEvent(await requireEventPermission(actor.principal, eventId, "data-packages.edit"));

  const packageId = randomUUID();
  await database.$transaction(async (transaction) => {
    await transaction.dataPackage.create({
      data: {
        id: packageId,
        eventId,
        name: input.name,
        description: input.description ?? null,
        layers: { create: { id: randomUUID(), name: "Layer 1", sortOrder: 0 } },
      },
    });
    await recordAudit(audit(actor, "data-package.created", packageId, eventId), transaction);
  });
  return loadDto(packageId);
}

export async function updateDataPackage(
  actor: ActorContext,
  eventId: string,
  packageId: string,
  input: UpdateDataPackageRequest,
): Promise<DataPackageDto> {
  const { event } = await requireDataPackage(actor.principal, eventId, packageId, "data-packages.edit");
  requireEditableEvent(event);

  const updated = await database.dataPackage.updateMany({
    where: { id: packageId, eventId, version: input.version },
    data: { name: input.name, description: input.description, version: { increment: 1 } },
  });
  if (updated.count !== 1) {
    const latest = await database.dataPackage.findUnique({ where: { id: packageId }, select: { version: true } });
    throw latest === null ? notFoundProblem() : versionConflictProblem(latest.version);
  }
  return loadDto(packageId);
}

/** Deletes the draft and its published revisions. */
export async function deleteDataPackage(actor: ActorContext, eventId: string, packageId: string): Promise<void> {
  const { event } = await requireDataPackage(actor.principal, eventId, packageId, "data-packages.edit");
  requireEditableEvent(event);

  await database.$transaction(async (transaction) => {
    await transaction.dataPackage.delete({ where: { id: packageId } });
    await recordAudit(audit(actor, "data-package.deleted", packageId, eventId), transaction);
  });
}
