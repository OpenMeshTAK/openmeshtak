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
import { completeStyle, directionStyleProblems } from "./object-style.js";
import { planningValidationGeometry } from "./planning-footprint.js";
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
  BatchPackageObjectsRequest,
  BatchPackageObjectsResponse,
} from "./package-object.dto.js";

export const MAX_OBJECTS_PER_PACKAGE = 5_000;

export const DEFAULT_STYLE: PackageObjectStyle = { color: "#1E88E5", strokeWidth: 3, fillOpacity: 0.25, strokeStyle: "solid", fillColor: null };

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
    style: completeStyle(row.style as unknown as PackageObjectStyle),
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
async function requireWritableLayer(packageId: string, layerId: string, client: Prisma.TransactionClient = database): Promise<void> {
  const layer = await client.packageLayer.findFirst({ where: { id: layerId, packageId }, select: { locked: true } });
  if (layer === null) {
    throw validationProblem([{ field: "layerId", code: "NOT_FOUND", message: "No layer with this ID exists in this data package." }]);
  }
  if (layer.locked) {
    throw layerLocked();
  }
}

/** Version checks and writes share a transaction: bulk editing never partly succeeds. */
export async function batchObjects(actor: ActorContext, eventId: string, packageId: string, input: BatchPackageObjectsRequest): Promise<BatchPackageObjectsResponse> {
  const { event } = await requireDataPackage(actor.principal, eventId, packageId, "data-packages.edit");
  requireEditableEvent(event);
  const ids = [...input.updates, ...input.deletes].map(({ id }) => id);
  const count = ids.length + input.creates.length;
  if (count < 1 || count > 500 || new Set(ids).size !== ids.length) {
    throw validationProblem([{ field: "updates", code: "INVALID_BATCH", message: "Choose 1–500 changes with no repeated object IDs." }]);
  }
  for (const item of [...input.updates, ...input.creates]) {
    validateGeometry(item.geometry);
    validateObjectPresentation(item.geometry, item.style ?? DEFAULT_STYLE);
  }
  return database.$transaction(async (tx) => {
    const existing = await tx.packageObject.findMany({ where: { packageId, id: { in: ids } } });
    const byId = new Map(existing.map((row) => [row.id, row]));
    for (const item of [...input.updates, ...input.deletes]) {
      const row = byId.get(item.id);
      if (row === undefined) throw notFoundProblem();
      if (row.version !== item.version) throw versionConflictProblem(row.version);
    }
    const layerIds = new Set([...existing.map(({ layerId }) => layerId), ...input.updates.map(({ layerId }) => layerId), ...input.creates.map(({ layerId }) => layerId)]);
    for (const layerId of layerIds) await requireWritableLayer(packageId, layerId, tx);
    const currentCount = await tx.packageObject.count({ where: { packageId } });
    if (currentCount - input.deletes.length + input.creates.length > MAX_OBJECTS_PER_PACKAGE) {
      throw validationProblem([{ field: "creates", code: "TOO_MANY_OBJECTS", message: `A data package can have at most ${String(MAX_OBJECTS_PER_PACKAGE)} objects.` }]);
    }
    const updated: PackageObjectDto[] = [];
    for (const item of input.updates) {
      const changed = await tx.packageObject.updateMany({ where: { id: item.id, packageId, version: item.version }, data: {
        layerId: item.layerId, name: item.name, description: item.description, kind: kindOf(item.geometry), geometry: jsonValue(item.geometry),
        style: jsonValue(item.style), tak: takColumn(item.geometry, item.tak), version: { increment: 1 },
      } });
      if (changed.count !== 1) throw versionConflictProblem(byId.get(item.id)?.version ?? item.version);
      updated.push(toObjectDto(await tx.packageObject.findUniqueOrThrow({ where: { id: item.id } })));
    }
    for (const item of input.deletes) {
      const deleted = await tx.packageObject.deleteMany({ where: { id: item.id, packageId, version: item.version } });
      if (deleted.count !== 1) throw versionConflictProblem(item.version);
    }
    const created: PackageObjectDto[] = [];
    for (const item of input.creates) {
      created.push(toObjectDto(await tx.packageObject.create({ data: { id: randomUUID(), packageId, layerId: item.layerId,
        name: item.name, description: item.description ?? null, kind: kindOf(item.geometry), geometry: jsonValue(item.geometry),
        style: jsonValue(item.style ?? DEFAULT_STYLE), tak: takColumn(item.geometry, item.tak),
      } })));
    }
    await clearDraftHash(tx, packageId);
    return { updated, created, deletedIds: input.deletes.map(({ id }) => id) };
  }, { timeout: 20_000 });
}

function validateGeometry(geometry: PackageGeometry): void {
  const problems = geometryProblems(geometry);
  if (problems.length > 0) {
    throw validationProblem(problems);
  }
}

export function validateObjectPresentation(geometry: PackageGeometry, style: PackageObjectStyle): void {
  const problems = directionStyleProblems(style, geometry);
  if (problems.length > 0) throw validationProblem(problems);
  try {
    for (const derived of planningValidationGeometry(geometry, style)) validateGeometry(derived);
  } catch (error) {
    if (error instanceof ProblemError) throw error;
    throw validationProblem([{ field: "style", code: "INVALID_FOOTPRINT", message: "The planning footprint cannot be generated. Use a shorter source, smaller radius/width or different centre." }]);
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
  validateObjectPresentation(input.geometry, input.style ?? DEFAULT_STYLE);

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
  validateObjectPresentation(input.geometry, input.style);

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
