import { randomUUID } from "node:crypto";
import type { PackageObject, Prisma } from "../../generated/prisma/client.js";
import type { ActorContext, Principal } from "../../shared/auth/principal.js";
import { database } from "../../shared/database/database.js";
import {
  notFoundProblem,
  ProblemError,
  validationProblem,
  versionConflictProblem,
} from "../../shared/errors/problem-error.js";
import {
  afterCursor,
  CURSOR_ORDER,
  DEFAULT_PAGE_LIMIT,
  decodeCursor,
  toPage,
} from "../../shared/pagination/cursor.js";
import { geometryProblems, kindOf } from "./geometry.js";
import { requireEditableEvent, requireDataPackage } from "./data-package-access.js";
import { clearDraftHash } from "./package-state.js";
import { readTak, takColumn } from "./tak-marker.js";
import type {
  CreatePackageObjectRequest,
  PackageGeometry,
  PackageObjectDto,
  PackageObjectKind,
  PackageObjectPage,
  PackageObjectStyle,
  UpdatePackageObjectRequest,
} from "./package-object.dto.js";

export const MAX_OBJECTS_PER_PACKAGE = 5_000;

export const DEFAULT_STYLE: PackageObjectStyle = { color: "#1E88E5", strokeWidth: 3, fillOpacity: 0.25 };

export function toObjectDto(row: PackageObject): PackageObjectDto {
  return {
    id: row.id,
    packageId: row.packageId,
    layerId: row.layerId,
    kind: row.kind as PackageObjectKind,
    name: row.name,
    description: row.description,
    // Written only by this service after validation.
    geometry: row.geometry as unknown as PackageGeometry,
    style: row.style as unknown as PackageObjectStyle,
    tak: readTak(row.tak),
    version: row.version,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function layerLocked(): ProblemError {
  return new ProblemError({
    type: "urn:openmeshtak:problem:layer-locked",
    title: "Layer is locked",
    status: 409,
    detail: "Unlock the layer before changing its objects.",
    code: "LAYER_LOCKED",
  });
}

/** The layer must belong to the same data package and be unlocked. */
async function requireWritableLayer(packageId: string, layerId: string): Promise<void> {
  const layer = await database.packageLayer.findFirst({ where: { id: layerId, packageId }, select: { locked: true } });
  if (layer === null) {
    throw validationProblem([{ field: "layerId", code: "NOT_FOUND", message: "No layer with this ID exists in this data package." }]);
  }
  if (layer.locked) {
    throw layerLocked();
  }
}

function validateGeometry(geometry: PackageGeometry): void {
  const problems = geometryProblems(geometry);
  if (problems.length > 0) {
    throw validationProblem(problems);
  }
}

async function findObject(packageId: string, objectId: string): Promise<PackageObject> {
  const row = await database.packageObject.findFirst({ where: { id: objectId, packageId } });
  if (row === null) {
    throw notFoundProblem();
  }
  return row;
}

function jsonValue(value: PackageGeometry | PackageObjectStyle): Prisma.InputJsonValue {
  return value as unknown as Prisma.InputJsonValue;
}

/** Ordered by creation; `layerId` narrows the list to one layer. */
export async function listObjects(
  principal: Principal,
  eventId: string,
  packageId: string,
  layerId: string | undefined,
  limit = DEFAULT_PAGE_LIMIT,
  cursor?: string,
): Promise<PackageObjectPage> {
  await requireDataPackage(principal, eventId, packageId, "data-packages.read");
  const context = `data-packages/${packageId}/objects?layer=${layerId ?? "*"}`;
  const position = cursor === undefined ? null : decodeCursor(context, cursor);

  const rows = await database.packageObject.findMany({
    where: { packageId, ...(layerId === undefined ? {} : { layerId }), ...afterCursor(position) },
    orderBy: [...CURSOR_ORDER],
    take: limit + 1,
  });
  return toPage(context, rows, limit, toObjectDto);
}

export async function getObject(
  principal: Principal,
  eventId: string,
  packageId: string,
  objectId: string,
): Promise<PackageObjectDto> {
  await requireDataPackage(principal, eventId, packageId, "data-packages.read");
  return toObjectDto(await findObject(packageId, objectId));
}

export async function createObject(
  actor: ActorContext,
  eventId: string,
  packageId: string,
  input: CreatePackageObjectRequest,
): Promise<PackageObjectDto> {
  const { event } = await requireDataPackage(actor.principal, eventId, packageId, "data-packages.edit");
  requireEditableEvent(event);
  await requireWritableLayer(packageId, input.layerId);
  validateGeometry(input.geometry);

  if ((await database.packageObject.count({ where: { packageId } })) >= MAX_OBJECTS_PER_PACKAGE) {
    throw new ProblemError({
      type: "urn:openmeshtak:problem:too-many-objects",
      title: "Too many objects",
      status: 409,
      detail: `A data package can have at most ${String(MAX_OBJECTS_PER_PACKAGE)} objects.`,
      code: "TOO_MANY_OBJECTS",
    });
  }

  const row = await database.packageObject.create({
    data: {
      id: randomUUID(),
      packageId,
      layerId: input.layerId,
      kind: kindOf(input.geometry),
      name: input.name,
      description: input.description ?? null,
      geometry: jsonValue(input.geometry),
      style: jsonValue(input.style ?? DEFAULT_STYLE),
      tak: takColumn(input.geometry, input.tak),
    },
  });
  await clearDraftHash(database, packageId);
  return toObjectDto(row);
}

export async function updateObject(
  actor: ActorContext,
  eventId: string,
  packageId: string,
  objectId: string,
  input: UpdatePackageObjectRequest,
): Promise<PackageObjectDto> {
  const { event } = await requireDataPackage(actor.principal, eventId, packageId, "data-packages.edit");
  requireEditableEvent(event);
  const current = await findObject(packageId, objectId);
  await requireWritableLayer(packageId, current.layerId);
  if (input.layerId !== current.layerId) {
    await requireWritableLayer(packageId, input.layerId);
  }
  validateGeometry(input.geometry);

  const updated = await database.packageObject.updateMany({
    where: { id: objectId, packageId, version: input.version },
    data: {
      layerId: input.layerId,
      kind: kindOf(input.geometry),
      name: input.name,
      description: input.description,
      geometry: jsonValue(input.geometry),
      style: jsonValue(input.style),
      tak: takColumn(input.geometry, input.tak),
      version: { increment: 1 },
    },
  });
  if (updated.count !== 1) {
    throw versionConflictProblem((await findObject(packageId, objectId)).version);
  }
  await clearDraftHash(database, packageId);
  return toObjectDto(await findObject(packageId, objectId));
}

export async function deleteObject(
  actor: ActorContext,
  eventId: string,
  packageId: string,
  objectId: string,
): Promise<void> {
  const { event } = await requireDataPackage(actor.principal, eventId, packageId, "data-packages.edit");
  requireEditableEvent(event);
  const current = await findObject(packageId, objectId);
  await requireWritableLayer(packageId, current.layerId);
  await database.packageObject.delete({ where: { id: current.id } });
  await clearDraftHash(database, packageId);
}
