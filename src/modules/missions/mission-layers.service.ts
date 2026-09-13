import { randomUUID } from "node:crypto";
import type { MissionLayer } from "../../generated/prisma/client.js";
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
  CreateMissionLayerRequest,
  MissionLayerDto,
  MissionLayerPage,
  UpdateMissionLayerRequest,
} from "./mission.dto.js";
import { requireEditableEvent, requireMission } from "./mission-access.js";

/** Keeps one mission understandable in the editor and bounded for publishing. */
export const MAX_LAYERS_PER_MISSION = 50;

export function toLayerDto(row: MissionLayer): MissionLayerDto {
  return {
    id: row.id,
    missionId: row.missionId,
    name: row.name,
    sortOrder: row.sortOrder,
    visible: row.visible,
    locked: row.locked,
    version: row.version,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function findLayer(missionId: string, layerId: string): Promise<MissionLayer> {
  const layer = await database.missionLayer.findFirst({ where: { id: layerId, missionId } });
  if (layer === null) {
    throw notFoundProblem();
  }
  return layer;
}

/** Ordered by creation for stable paging; clients sort by `sortOrder` for display. */
export async function listLayers(
  principal: Principal,
  eventId: string,
  missionId: string,
  limit = DEFAULT_PAGE_LIMIT,
  cursor?: string,
): Promise<MissionLayerPage> {
  await requireMission(principal, eventId, missionId, "missions.read");
  const context = `missions/${missionId}/layers`;
  const position = cursor === undefined ? null : decodeCursor(context, cursor);

  const rows = await database.missionLayer.findMany({
    where: { missionId, ...afterCursor(position) },
    orderBy: [...CURSOR_ORDER],
    take: limit + 1,
  });
  return toPage(context, rows, limit, toLayerDto);
}

export async function createLayer(
  actor: ActorContext,
  eventId: string,
  missionId: string,
  input: CreateMissionLayerRequest,
): Promise<MissionLayerDto> {
  const { event } = await requireMission(actor.principal, eventId, missionId, "missions.edit");
  requireEditableEvent(event);

  return database.$transaction(async (transaction) => {
    const existing = await transaction.missionLayer.aggregate({
      where: { missionId },
      _count: true,
      _max: { sortOrder: true },
    });
    if (existing._count >= MAX_LAYERS_PER_MISSION) {
      throw new ProblemError({
        type: "urn:openmeshtak:problem:too-many-layers",
        title: "Too many layers",
        status: 409,
        detail: `A mission can have at most ${String(MAX_LAYERS_PER_MISSION)} layers.`,
        code: "TOO_MANY_LAYERS",
      });
    }
    const row = await transaction.missionLayer.create({
      data: { id: randomUUID(), missionId, name: input.name, sortOrder: (existing._max.sortOrder ?? -1) + 1 },
    });
    return toLayerDto(row);
  });
}

export async function updateLayer(
  actor: ActorContext,
  eventId: string,
  missionId: string,
  layerId: string,
  input: UpdateMissionLayerRequest,
): Promise<MissionLayerDto> {
  const { event } = await requireMission(actor.principal, eventId, missionId, "missions.edit");
  requireEditableEvent(event);
  await findLayer(missionId, layerId);

  const updated = await database.missionLayer.updateMany({
    where: { id: layerId, missionId, version: input.version },
    data: {
      name: input.name,
      sortOrder: input.sortOrder,
      visible: input.visible,
      locked: input.locked,
      version: { increment: 1 },
    },
  });
  if (updated.count !== 1) {
    throw versionConflictProblem((await findLayer(missionId, layerId)).version);
  }
  return toLayerDto(await findLayer(missionId, layerId));
}

/** Deleting a layer deletes its objects; the editor confirms this first. */
export async function deleteLayer(
  actor: ActorContext,
  eventId: string,
  missionId: string,
  layerId: string,
): Promise<void> {
  const { event } = await requireMission(actor.principal, eventId, missionId, "missions.edit");
  requireEditableEvent(event);
  const layer = await findLayer(missionId, layerId);
  await database.missionLayer.delete({ where: { id: layer.id } });
}
