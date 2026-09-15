import { randomUUID } from "node:crypto";
import type { MissionRevision, Prisma } from "../../generated/prisma/client.js";
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
import { requireEditableEvent, requireMission } from "./mission-access.js";
import type {
  MissionRevisionDto,
  MissionRevisionPage,
  MissionRevisionSummaryDto,
  PublishMissionResponse,
} from "./mission-revision.dto.js";
import { buildMissionSnapshot, hashMissionSnapshot, type MissionSnapshot } from "./mission-snapshot.js";

function toSummary(row: MissionRevision): MissionRevisionSummaryDto {
  return {
    id: row.id,
    missionId: row.missionId,
    number: row.number,
    snapshotHash: row.snapshotHash,
    createdAt: row.createdAt.toISOString(),
  };
}

function toDto(row: MissionRevision): MissionRevisionDto {
  // Revisions are written only by `publishMission` from `MissionSnapshot` values.
  return { ...toSummary(row), snapshot: row.snapshot as unknown as MissionSnapshot };
}

/**
 * Freezes the current draft as the next immutable revision. Publishing an unchanged draft returns
 * the latest revision instead of a duplicate. Requires `missions.publish`.
 */
export async function publishMission(
  actor: ActorContext,
  eventId: string,
  missionId: string,
): Promise<PublishMissionResponse> {
  const { event } = await requireMission(actor.principal, eventId, missionId, "missions.publish");
  requireEditableEvent(event);

  return database.$transaction(async (transaction) => {
    const snapshot = await buildMissionSnapshot(transaction, missionId);
    const snapshotHash = hashMissionSnapshot(snapshot);
    const latest = await transaction.missionRevision.findFirst({
      where: { missionId },
      orderBy: { number: "desc" },
    });
    if (latest?.snapshotHash === snapshotHash) {
      return { created: false, revision: toDto(latest) };
    }

    const revision = await transaction.missionRevision.create({
      data: {
        id: randomUUID(),
        missionId,
        number: (latest?.number ?? 0) + 1,
        snapshot: snapshot as unknown as Prisma.InputJsonObject,
        snapshotHash,
        createdByType: actor.principal.type,
        createdById: actor.principal.id,
      },
    });
    await recordAudit(
      {
        actor: actor.principal,
        action: "mission.published",
        targetType: "mission-revision",
        targetId: revision.id,
        result: "success",
        traceId: actor.traceId,
        metadata: { eventId, missionId, number: revision.number },
      },
      transaction,
    );
    return { created: true, revision: toDto(revision) };
  });
}

export async function listRevisions(
  principal: Principal,
  eventId: string,
  missionId: string,
  limit = DEFAULT_PAGE_LIMIT,
  cursor?: string,
): Promise<MissionRevisionPage> {
  await requireMission(principal, eventId, missionId, "missions.read");
  const context = `missions/${missionId}/revisions`;
  const position = cursor === undefined ? null : decodeCursor(context, cursor);

  const rows = await database.missionRevision.findMany({
    where: { missionId, ...afterCursor(position) },
    orderBy: [...CURSOR_ORDER],
    take: limit + 1,
  });
  return toPage(context, rows, limit, toSummary);
}

export async function getRevision(
  principal: Principal,
  eventId: string,
  missionId: string,
  number: number,
): Promise<MissionRevisionDto> {
  await requireMission(principal, eventId, missionId, "missions.read");
  const row = await database.missionRevision.findUnique({ where: { missionId_number: { missionId, number } } });
  if (row === null) {
    throw notFoundProblem();
  }
  return toDto(row);
}
