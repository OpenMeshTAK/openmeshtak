import { randomUUID } from "node:crypto";
import type { Prisma } from "../../generated/prisma/client.js";
import { recordAudit } from "../../shared/audit/audit.js";
import type { ActorContext, Principal } from "../../shared/auth/principal.js";
import { database } from "../../shared/database/database.js";
import { notFoundProblem, ProblemError } from "../../shared/errors/problem-error.js";
import { convertGeoJson, snapshotToGeoJson } from "./geojson.js";
import { kindOf } from "./geometry.js";
import { requireEditableEvent, requireMission } from "./mission-access.js";
import type { GeoJsonDocument, GeoJsonFeatureCollection, GeoJsonImportReport } from "./mission-import.dto.js";
import { findLayer } from "./mission-layers.service.js";
import { DEFAULT_STYLE, MAX_OBJECTS_PER_MISSION } from "./mission-objects.service.js";
import { buildMissionSnapshot, type MissionSnapshot } from "./mission-snapshot.js";

/**
 * Imports GeoJSON into one layer. All valid features are created in one transaction; the report
 * lists every feature that was changed, skipped or rejected so nothing disappears silently.
 */
export async function importGeoJson(
  actor: ActorContext,
  eventId: string,
  missionId: string,
  layerId: string,
  document: GeoJsonDocument,
): Promise<GeoJsonImportReport> {
  const { event } = await requireMission(actor.principal, eventId, missionId, "missions.edit");
  requireEditableEvent(event);
  const layer = await findLayer(missionId, layerId);
  if (layer.locked) {
    throw new ProblemError({
      type: "urn:openmeshtak:problem:layer-locked",
      title: "Layer is locked",
      status: 409,
      detail: "Unlock the layer before importing into it.",
      code: "LAYER_LOCKED",
    });
  }

  const { candidates, report } = convertGeoJson(document, DEFAULT_STYLE);
  await database.$transaction(async (transaction) => {
    const existing = await transaction.missionObject.count({ where: { missionId } });
    if (existing + candidates.length > MAX_OBJECTS_PER_MISSION) {
      throw new ProblemError({
        type: "urn:openmeshtak:problem:too-many-objects",
        title: "Too many objects",
        status: 409,
        detail: `The import would exceed ${String(MAX_OBJECTS_PER_MISSION)} objects in this mission.`,
        code: "TOO_MANY_OBJECTS",
      });
    }
    // Objects are ordered by creation time; one millisecond per feature keeps the file order
    // instead of letting random IDs break ties.
    const importedAt = Date.now();
    await transaction.missionObject.createMany({
      data: candidates.map((candidate, index) => ({
        id: randomUUID(),
        createdAt: new Date(importedAt + index),
        missionId,
        layerId,
        kind: kindOf(candidate.geometry),
        name: candidate.name,
        description: candidate.description,
        geometry: candidate.geometry as unknown as Prisma.InputJsonValue,
        style: candidate.style as unknown as Prisma.InputJsonValue,
      })),
    });
    await recordAudit(
      {
        actor: actor.principal,
        action: "mission.imported",
        targetType: "mission",
        targetId: missionId,
        result: "success",
        traceId: actor.traceId,
        metadata: {
          eventId,
          layerId,
          accepted: candidates.length,
          skipped: report.skipped.length,
          rejected: report.rejected.length,
        },
      },
      transaction,
    );
  });
  return { accepted: candidates.length, ...report };
}

export async function exportDraftGeoJson(
  principal: Principal,
  eventId: string,
  missionId: string,
): Promise<GeoJsonFeatureCollection> {
  await requireMission(principal, eventId, missionId, "missions.read");
  return snapshotToGeoJson(await buildMissionSnapshot(database, missionId)) as unknown as GeoJsonFeatureCollection;
}

export async function exportRevisionGeoJson(
  principal: Principal,
  eventId: string,
  missionId: string,
  number: number,
): Promise<GeoJsonFeatureCollection> {
  await requireMission(principal, eventId, missionId, "missions.read");
  const revision = await database.missionRevision.findUnique({
    where: { missionId_number: { missionId, number } },
    select: { snapshot: true },
  });
  if (revision === null) {
    throw notFoundProblem();
  }
  return snapshotToGeoJson(revision.snapshot as unknown as MissionSnapshot) as unknown as GeoJsonFeatureCollection;
}
