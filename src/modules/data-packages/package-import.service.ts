import { randomUUID } from "node:crypto";
import type { PackageRevision, Prisma } from "../../generated/prisma/client.js";
import { recordAudit } from "../../shared/audit/audit.js";
import type { ActorContext, Principal } from "../../shared/auth/principal.js";
import { database } from "../../shared/database/database.js";
import { notFoundProblem, ProblemError } from "../../shared/errors/problem-error.js";
import { requireDataPackage, requireEditableEvent } from "./data-package-access.js";
import { convertGeoJson, snapshotToGeoJson } from "./geojson.js";
import { kindOf } from "./geometry.js";
import type { ImportConversion } from "./import-candidate.js";
import type { GeoJsonDocument, GeoJsonFeatureCollection, ImportReport } from "./package-import.dto.js";
import { findLayer } from "./package-layers.service.js";
import { DEFAULT_STYLE, MAX_OBJECTS_PER_PACKAGE } from "./package-objects.service.js";
import { buildPackageSnapshot, snapshotOfLayer, type PackageSnapshot } from "./package-snapshot.js";

export type ImportFormat = "geojson" | "atak";

/** Checks access and the target layer before any (possibly large) input is converted. */
export async function requireImportTarget(
  actor: ActorContext,
  eventId: string,
  packageId: string,
  layerId: string,
): Promise<void> {
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
}

/**
 * Saves all valid objects of a converted import in one transaction. The report lists every item
 * that was changed, skipped or rejected so nothing disappears silently.
 */
export async function saveImport(
  actor: ActorContext,
  eventId: string,
  packageId: string,
  layerId: string,
  { candidates, report }: ImportConversion,
  format: ImportFormat,
): Promise<ImportReport> {
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
    // Objects are ordered by creation time; one millisecond per item keeps the file order instead
    // of letting random IDs break ties.
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
          format,
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

export async function importGeoJson(
  actor: ActorContext,
  eventId: string,
  packageId: string,
  layerId: string,
  document: GeoJsonDocument,
): Promise<ImportReport> {
  await requireImportTarget(actor, eventId, packageId, layerId);
  return saveImport(actor, eventId, packageId, layerId, convertGeoJson(document, DEFAULT_STYLE), "geojson");
}

export async function findRevision(packageId: string, number: number): Promise<PackageRevision> {
  const revision = await database.packageRevision.findUnique({ where: { packageId_number: { packageId, number } } });
  if (revision === null) {
    throw notFoundProblem();
  }
  return revision;
}

/** The whole snapshot, or only one of its layers; an unknown layer is a `404`. */
export function exportedSnapshot(snapshot: PackageSnapshot, layerId: string | undefined): PackageSnapshot {
  if (layerId === undefined) {
    return snapshot;
  }
  const layer = snapshotOfLayer(snapshot, layerId);
  if (layer === null) {
    throw notFoundProblem();
  }
  return layer;
}

export async function exportDraftGeoJson(
  principal: Principal,
  eventId: string,
  packageId: string,
  layerId?: string,
): Promise<GeoJsonFeatureCollection> {
  await requireDataPackage(principal, eventId, packageId, "data-packages.read");
  const snapshot = exportedSnapshot(await buildPackageSnapshot(database, packageId), layerId);
  return snapshotToGeoJson(snapshot) as unknown as GeoJsonFeatureCollection;
}

export async function exportRevisionGeoJson(
  principal: Principal,
  eventId: string,
  packageId: string,
  number: number,
  layerId?: string,
): Promise<GeoJsonFeatureCollection> {
  await requireDataPackage(principal, eventId, packageId, "data-packages.read");
  const revision = await findRevision(packageId, number);
  const snapshot = exportedSnapshot(revision.snapshot as unknown as PackageSnapshot, layerId);
  return snapshotToGeoJson(snapshot) as unknown as GeoJsonFeatureCollection;
}
