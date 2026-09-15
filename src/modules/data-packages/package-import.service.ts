import { randomUUID } from "node:crypto";
import type { Prisma } from "../../generated/prisma/client.js";
import { recordAudit } from "../../shared/audit/audit.js";
import type { ActorContext, Principal } from "../../shared/auth/principal.js";
import { database } from "../../shared/database/database.js";
import { notFoundProblem, ProblemError } from "../../shared/errors/problem-error.js";
import { convertGeoJson, snapshotToGeoJson } from "./geojson.js";
import { kindOf } from "./geometry.js";
import { requireEditableEvent, requireDataPackage } from "./data-package-access.js";
import type { GeoJsonDocument, GeoJsonFeatureCollection, GeoJsonImportReport } from "./package-import.dto.js";
import { findLayer } from "./package-layers.service.js";
import { DEFAULT_STYLE, MAX_OBJECTS_PER_PACKAGE } from "./package-objects.service.js";
import { buildPackageSnapshot, type PackageSnapshot } from "./package-snapshot.js";

/**
 * Imports GeoJSON into one layer. All valid features are created in one transaction; the report
 * lists every feature that was changed, skipped or rejected so nothing disappears silently.
 */
export async function importGeoJson(
  actor: ActorContext,
  eventId: string,
  packageId: string,
  layerId: string,
  document: GeoJsonDocument,
): Promise<GeoJsonImportReport> {
  const { event } = await requireDataPackage(actor.principal, eventId, packageId, "data-packages.edit");
  requireEditableEvent(event);
  const layer = await findLayer(packageId, layerId);
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
    const existing = await transaction.packageObject.count({ where: { packageId } });
    if (existing + candidates.length > MAX_OBJECTS_PER_PACKAGE) {
      throw new ProblemError({
        type: "urn:openmeshtak:problem:too-many-objects",
        title: "Too many objects",
        status: 409,
        detail: `The import would exceed ${String(MAX_OBJECTS_PER_PACKAGE)} objects in this data package.`,
        code: "TOO_MANY_OBJECTS",
      });
    }
    // Objects are ordered by creation time; one millisecond per feature keeps the file order
    // instead of letting random IDs break ties.
    const importedAt = Date.now();
    await transaction.packageObject.createMany({
      data: candidates.map((candidate, index) => ({
        id: randomUUID(),
        createdAt: new Date(importedAt + index),
        packageId,
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
        action: "data-package.imported",
        targetType: "data-package",
        targetId: packageId,
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
  packageId: string,
): Promise<GeoJsonFeatureCollection> {
  await requireDataPackage(principal, eventId, packageId, "data-packages.read");
  return snapshotToGeoJson(await buildPackageSnapshot(database, packageId)) as unknown as GeoJsonFeatureCollection;
}

export async function exportRevisionGeoJson(
  principal: Principal,
  eventId: string,
  packageId: string,
  number: number,
): Promise<GeoJsonFeatureCollection> {
  await requireDataPackage(principal, eventId, packageId, "data-packages.read");
  const revision = await database.packageRevision.findUnique({
    where: { packageId_number: { packageId, number } },
    select: { snapshot: true },
  });
  if (revision === null) {
    throw notFoundProblem();
  }
  return snapshotToGeoJson(revision.snapshot as unknown as PackageSnapshot) as unknown as GeoJsonFeatureCollection;
}
