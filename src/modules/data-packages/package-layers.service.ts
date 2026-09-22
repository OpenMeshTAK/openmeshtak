import { randomUUID } from "node:crypto";
import type { PackageLayer } from "../../generated/prisma/client.js";
import type { ActorContext, Principal } from "../../shared/auth/principal.js";
import { database } from "../../shared/database/database.js";
import { notFoundProblem, ProblemError, versionConflictProblem } from "../../shared/errors/problem-error.js";
import {
  afterCursor,
  CURSOR_ORDER,
  DEFAULT_PAGE_LIMIT,
  decodeCursor,
  toPage,
} from "../../shared/pagination/cursor.js";
import type {
  CreatePackageLayerRequest,
  PackageLayerDto,
  PackageLayerPage,
  UpdatePackageLayerRequest,
} from "./data-package.dto.js";
import { requireEditableEvent, requireDataPackage } from "./data-package-access.js";
import { referencedBlobIds, removeUnreferencedBlobs } from "./package-content-cleanup.js";

/** Keeps one data package understandable in the editor and bounded for publishing. */
export const MAX_LAYERS_PER_PACKAGE = 50;

export function toLayerDto(row: PackageLayer): PackageLayerDto {
  return {
    id: row.id,
    packageId: row.packageId,
    name: row.name,
    sortOrder: row.sortOrder,
    visible: row.visible,
    locked: row.locked,
    version: row.version,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function findLayer(packageId: string, layerId: string): Promise<PackageLayer> {
  const layer = await database.packageLayer.findFirst({ where: { id: layerId, packageId } });
  if (layer === null) {
    throw notFoundProblem();
  }
  return layer;
}

/** Ordered by creation for stable paging; clients sort by `sortOrder` for display. */
export async function listLayers(
  principal: Principal,
  eventId: string,
  packageId: string,
  limit = DEFAULT_PAGE_LIMIT,
  cursor?: string,
): Promise<PackageLayerPage> {
  await requireDataPackage(principal, eventId, packageId, "data-packages.read");
  const context = `data-packages/${packageId}/layers`;
  const position = cursor === undefined ? null : decodeCursor(context, cursor);

  const rows = await database.packageLayer.findMany({
    where: { packageId, ...afterCursor(position) },
    orderBy: [...CURSOR_ORDER],
    take: limit + 1,
  });
  return toPage(context, rows, limit, toLayerDto);
}

export async function createLayer(
  actor: ActorContext,
  eventId: string,
  packageId: string,
  input: CreatePackageLayerRequest,
): Promise<PackageLayerDto> {
  const { event } = await requireDataPackage(actor.principal, eventId, packageId, "data-packages.edit");
  requireEditableEvent(event);

  return database.$transaction(async (transaction) => {
    const existing = await transaction.packageLayer.aggregate({
      where: { packageId },
      _count: true,
      _max: { sortOrder: true },
    });
    if (existing._count >= MAX_LAYERS_PER_PACKAGE) {
      throw new ProblemError({
        type: "urn:openmeshtak:problem:too-many-layers",
        title: "Too many layers",
        status: 409,
        detail: `A data package can have at most ${String(MAX_LAYERS_PER_PACKAGE)} layers.`,
        code: "TOO_MANY_LAYERS",
      });
    }
    const row = await transaction.packageLayer.create({
      data: { id: randomUUID(), packageId, name: input.name, sortOrder: (existing._max.sortOrder ?? -1) + 1 },
    });
    return toLayerDto(row);
  });
}

export async function updateLayer(
  actor: ActorContext,
  eventId: string,
  packageId: string,
  layerId: string,
  input: UpdatePackageLayerRequest,
): Promise<PackageLayerDto> {
  const { event } = await requireDataPackage(actor.principal, eventId, packageId, "data-packages.edit");
  requireEditableEvent(event);
  await findLayer(packageId, layerId);

  const updated = await database.packageLayer.updateMany({
    where: { id: layerId, packageId, version: input.version },
    data: {
      name: input.name,
      sortOrder: input.sortOrder,
      visible: input.visible,
      locked: input.locked,
      version: { increment: 1 },
    },
  });
  if (updated.count !== 1) {
    throw versionConflictProblem((await findLayer(packageId, layerId)).version);
  }
  return toLayerDto(await findLayer(packageId, layerId));
}

/** Deleting a layer deletes its objects; the editor confirms this first. */
export async function deleteLayer(
  actor: ActorContext,
  eventId: string,
  packageId: string,
  layerId: string,
): Promise<void> {
  const { event } = await requireDataPackage(actor.principal, eventId, packageId, "data-packages.edit");
  requireEditableEvent(event);
  const layer = await findLayer(packageId, layerId);
  const blobIds = await referencedBlobIds(packageId, layer.id);
  await database.packageLayer.delete({ where: { id: layer.id } });
  await removeUnreferencedBlobs(eventId, blobIds);
}
