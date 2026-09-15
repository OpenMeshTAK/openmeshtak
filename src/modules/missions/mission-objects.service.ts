import { randomUUID } from "node:crypto";
import type { MissionObject, Prisma } from "../../generated/prisma/client.js";
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
import { requireEditableEvent, requireMission } from "./mission-access.js";
import type {
  CreateMissionObjectRequest,
  MissionGeometry,
  MissionObjectDto,
  MissionObjectKind,
  MissionObjectPage,
  MissionObjectStyle,
  UpdateMissionObjectRequest,
} from "./mission-object.dto.js";

export const MAX_OBJECTS_PER_MISSION = 5_000;

export const DEFAULT_STYLE: MissionObjectStyle = { color: "#1E88E5", strokeWidth: 3, fillOpacity: 0.25 };

export function toObjectDto(row: MissionObject): MissionObjectDto {
  return {
    id: row.id,
    missionId: row.missionId,
    layerId: row.layerId,
    kind: row.kind as MissionObjectKind,
    name: row.name,
    description: row.description,
    // Written only by this service after validation.
    geometry: row.geometry as unknown as MissionGeometry,
    style: row.style as unknown as MissionObjectStyle,
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

/** The layer must belong to the same mission and be unlocked. */
async function requireWritableLayer(missionId: string, layerId: string): Promise<void> {
  const layer = await database.missionLayer.findFirst({ where: { id: layerId, missionId }, select: { locked: true } });
  if (layer === null) {
    throw validationProblem([{ field: "layerId", code: "NOT_FOUND", message: "No layer with this ID exists in this mission." }]);
  }
  if (layer.locked) {
    throw layerLocked();
  }
}

function validateGeometry(geometry: MissionGeometry): void {
  const problems = geometryProblems(geometry);
  if (problems.length > 0) {
    throw validationProblem(problems);
  }
}

async function findObject(missionId: string, objectId: string): Promise<MissionObject> {
  const row = await database.missionObject.findFirst({ where: { id: objectId, missionId } });
  if (row === null) {
    throw notFoundProblem();
  }
  return row;
}

function jsonValue(value: MissionGeometry | MissionObjectStyle): Prisma.InputJsonValue {
  return value as unknown as Prisma.InputJsonValue;
}

/** Ordered by creation; `layerId` narrows the list to one layer. */
export async function listObjects(
  principal: Principal,
  eventId: string,
  missionId: string,
  layerId: string | undefined,
  limit = DEFAULT_PAGE_LIMIT,
  cursor?: string,
): Promise<MissionObjectPage> {
  await requireMission(principal, eventId, missionId, "missions.read");
  const context = `missions/${missionId}/objects?layer=${layerId ?? "*"}`;
  const position = cursor === undefined ? null : decodeCursor(context, cursor);

  const rows = await database.missionObject.findMany({
    where: { missionId, ...(layerId === undefined ? {} : { layerId }), ...afterCursor(position) },
    orderBy: [...CURSOR_ORDER],
    take: limit + 1,
  });
  return toPage(context, rows, limit, toObjectDto);
}

export async function getObject(
  principal: Principal,
  eventId: string,
  missionId: string,
  objectId: string,
): Promise<MissionObjectDto> {
  await requireMission(principal, eventId, missionId, "missions.read");
  return toObjectDto(await findObject(missionId, objectId));
}

export async function createObject(
  actor: ActorContext,
  eventId: string,
  missionId: string,
  input: CreateMissionObjectRequest,
): Promise<MissionObjectDto> {
  const { event } = await requireMission(actor.principal, eventId, missionId, "missions.edit");
  requireEditableEvent(event);
  await requireWritableLayer(missionId, input.layerId);
  validateGeometry(input.geometry);

  if ((await database.missionObject.count({ where: { missionId } })) >= MAX_OBJECTS_PER_MISSION) {
    throw new ProblemError({
      type: "urn:openmeshtak:problem:too-many-objects",
      title: "Too many objects",
      status: 409,
      detail: `A mission can have at most ${String(MAX_OBJECTS_PER_MISSION)} objects.`,
      code: "TOO_MANY_OBJECTS",
    });
  }

  const row = await database.missionObject.create({
    data: {
      id: randomUUID(),
      missionId,
      layerId: input.layerId,
      kind: kindOf(input.geometry),
      name: input.name,
      description: input.description ?? null,
      geometry: jsonValue(input.geometry),
      style: jsonValue(input.style ?? DEFAULT_STYLE),
    },
  });
  return toObjectDto(row);
}

export async function updateObject(
  actor: ActorContext,
  eventId: string,
  missionId: string,
  objectId: string,
  input: UpdateMissionObjectRequest,
): Promise<MissionObjectDto> {
  const { event } = await requireMission(actor.principal, eventId, missionId, "missions.edit");
  requireEditableEvent(event);
  const current = await findObject(missionId, objectId);
  await requireWritableLayer(missionId, current.layerId);
  if (input.layerId !== current.layerId) {
    await requireWritableLayer(missionId, input.layerId);
  }
  validateGeometry(input.geometry);

  const updated = await database.missionObject.updateMany({
    where: { id: objectId, missionId, version: input.version },
    data: {
      layerId: input.layerId,
      kind: kindOf(input.geometry),
      name: input.name,
      description: input.description,
      geometry: jsonValue(input.geometry),
      style: jsonValue(input.style),
      version: { increment: 1 },
    },
  });
  if (updated.count !== 1) {
    throw versionConflictProblem((await findObject(missionId, objectId)).version);
  }
  return toObjectDto(await findObject(missionId, objectId));
}

export async function deleteObject(
  actor: ActorContext,
  eventId: string,
  missionId: string,
  objectId: string,
): Promise<void> {
  const { event } = await requireMission(actor.principal, eventId, missionId, "missions.edit");
  requireEditableEvent(event);
  const current = await findObject(missionId, objectId);
  await requireWritableLayer(missionId, current.layerId);
  await database.missionObject.delete({ where: { id: current.id } });
}
