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
import { requireEventPermission } from "../events/event-access.js";
import type { CreateMissionRequest, MissionDto, MissionPage, UpdateMissionRequest } from "./mission.dto.js";
import { requireEditableEvent, requireMission } from "./mission-access.js";

const missionSelection = {
  id: true,
  eventId: true,
  name: true,
  description: true,
  version: true,
  createdAt: true,
  updatedAt: true,
  revisions: { select: { number: true }, orderBy: { number: "desc" }, take: 1 },
} satisfies Prisma.MissionProjectSelect;

type MissionRow = Prisma.MissionProjectGetPayload<{ select: typeof missionSelection }>;

function toDto(row: MissionRow): MissionDto {
  return {
    id: row.id,
    eventId: row.eventId,
    name: row.name,
    description: row.description,
    latestRevision: row.revisions[0]?.number ?? null,
    version: row.version,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

async function loadDto(missionId: string): Promise<MissionDto> {
  return toDto(
    await database.missionProject.findUniqueOrThrow({ where: { id: missionId }, select: missionSelection }),
  );
}

function audit(actor: ActorContext, action: string, missionId: string, eventId: string) {
  return {
    actor: actor.principal,
    action,
    targetType: "mission",
    targetId: missionId,
    result: "success" as const,
    traceId: actor.traceId,
    metadata: { eventId },
  };
}

export async function listMissions(
  principal: Principal,
  eventId: string,
  limit = DEFAULT_PAGE_LIMIT,
  cursor?: string,
): Promise<MissionPage> {
  await requireEventPermission(principal, eventId, "missions.read");
  const context = `events/${eventId}/missions`;
  const position = cursor === undefined ? null : decodeCursor(context, cursor);

  const rows = await database.missionProject.findMany({
    where: { eventId, ...afterCursor(position) },
    orderBy: [...CURSOR_ORDER],
    take: limit + 1,
    select: missionSelection,
  });
  return toPage(context, rows, limit, toDto);
}

export async function getMission(principal: Principal, eventId: string, missionId: string): Promise<MissionDto> {
  await requireMission(principal, eventId, missionId, "missions.read");
  return loadDto(missionId);
}

/** New missions start with one empty layer so the editor can draw immediately. */
export async function createMission(
  actor: ActorContext,
  eventId: string,
  input: CreateMissionRequest,
): Promise<MissionDto> {
  requireEditableEvent(await requireEventPermission(actor.principal, eventId, "missions.edit"));

  const missionId = randomUUID();
  await database.$transaction(async (transaction) => {
    await transaction.missionProject.create({
      data: {
        id: missionId,
        eventId,
        name: input.name,
        description: input.description ?? null,
        layers: { create: { id: randomUUID(), name: "Layer 1", sortOrder: 0 } },
      },
    });
    await recordAudit(audit(actor, "mission.created", missionId, eventId), transaction);
  });
  return loadDto(missionId);
}

export async function updateMission(
  actor: ActorContext,
  eventId: string,
  missionId: string,
  input: UpdateMissionRequest,
): Promise<MissionDto> {
  const { event } = await requireMission(actor.principal, eventId, missionId, "missions.edit");
  requireEditableEvent(event);

  const updated = await database.missionProject.updateMany({
    where: { id: missionId, eventId, version: input.version },
    data: { name: input.name, description: input.description, version: { increment: 1 } },
  });
  if (updated.count !== 1) {
    const latest = await database.missionProject.findUnique({ where: { id: missionId }, select: { version: true } });
    throw latest === null ? notFoundProblem() : versionConflictProblem(latest.version);
  }
  return loadDto(missionId);
}

/** Deletes the draft and its published revisions. */
export async function deleteMission(actor: ActorContext, eventId: string, missionId: string): Promise<void> {
  const { event } = await requireMission(actor.principal, eventId, missionId, "missions.edit");
  requireEditableEvent(event);

  await database.$transaction(async (transaction) => {
    await transaction.missionProject.delete({ where: { id: missionId } });
    await recordAudit(audit(actor, "mission.deleted", missionId, eventId), transaction);
  });
}
