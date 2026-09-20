import type { PackageRevision } from "../../generated/prisma/client.js";
import type { ActorContext, Principal } from "../../shared/auth/principal.js";
import { convertCotEvent } from "./atak/cot-import.js";
import { objectToCot } from "./atak/cot-export.js";
import { readDataPackage, writeDataPackage } from "./atak/data-package-archive.js";
import { requireDataPackage } from "./data-package-access.js";
import { emptyConversion, type ImportConversion } from "./import-candidate.js";
import type { ImportReport } from "./package-import.dto.js";
import { exportedSnapshot, findRevision, requireImportTarget, saveImport } from "./package-import.service.js";
import { DEFAULT_STYLE } from "./package-objects.service.js";
import type { PackageSnapshot } from "./package-snapshot.js";

/** Report label for one archive entry: `<uid>/<uid>.cot` becomes `<uid>.cot`. */
function entryLabel(path: string): string {
  return path.split("/").at(-1) ?? path;
}

function convertDataPackage(bytes: Uint8Array): ImportConversion {
  const archive = readDataPackage(bytes);
  const conversion = emptyConversion();
  conversion.report.skipped.push(...archive.skipped);

  for (const file of archive.cotFiles) {
    const result = convertCotEvent(file.xml, DEFAULT_STYLE);
    if (result.outcome === "accepted") {
      conversion.candidates.push(result.candidate);
      if (result.changes.length > 0) {
        conversion.report.changed.push({ feature: result.candidate.name, message: result.changes.join("; ") });
      }
    } else {
      conversion.report[result.outcome].push({ feature: entryLabel(file.path), message: result.message });
    }
  }
  return conversion;
}

/** Imports an ATAK Data Package (ZIP) or a single CoT file into one layer. */
export async function importAtak(
  actor: ActorContext,
  eventId: string,
  packageId: string,
  layerId: string,
  bytes: Uint8Array,
): Promise<ImportReport> {
  await requireImportTarget(actor, eventId, packageId, layerId);
  return saveImport(actor, eventId, packageId, layerId, convertDataPackage(bytes), "atak");
}

export interface AtakExport {
  fileName: string;
  bytes: Uint8Array;
}

/**
 * Builds the ATAK Data Package of a published revision, or of one of its layers. The package UID
 * is the data package ID (or the layer ID for a single layer), so importing a newer revision on a
 * device replaces the older one without replacing the other packages.
 */
export async function exportAtak(
  principal: Principal,
  eventId: string,
  packageId: string,
  number: number,
  layerId?: string,
): Promise<AtakExport> {
  await requireDataPackage(principal, eventId, packageId, "data-packages.read");
  return buildAtakExport(packageId, await findRevision(packageId, number), layerId);
}

/** Builds the export without permission checks; callers authorize first. */
export function buildAtakExport(packageId: string, revision: PackageRevision, layerId?: string): AtakExport {
  const snapshot = exportedSnapshot(revision.snapshot as unknown as PackageSnapshot, layerId);
  const bytes = writeDataPackage(
    {
      uid: layerId ?? packageId,
      name: snapshot.name,
      events: snapshot.objects.map((object) => ({ uid: object.id, xml: objectToCot(object, revision.createdAt) })),
    },
    revision.createdAt,
  );
  const safeName = snapshot.name.replace(/[^\w.-]+/g, "_").slice(0, 80) || "data-package";
  return { fileName: `${safeName}-r${String(revision.number)}.zip`, bytes };
}
