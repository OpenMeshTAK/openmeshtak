import { createHash, randomUUID } from "node:crypto";
import type { PackageRevision } from "../../generated/prisma/client.js";
import type { ActorContext, Principal } from "../../shared/auth/principal.js";
import { database } from "../../shared/database/database.js";
import { removeBlob, writeBlob } from "../../shared/storage/blob-storage.js";
import { convertCotEvent } from "./atak/cot-import.js";
import { objectToCot } from "./atak/cot-export.js";
import { readDataPackage, writeDataPackage } from "./atak/data-package-archive.js";
import { requireDataPackage } from "./data-package-access.js";
import { emptyConversion, type ImportConversion } from "./import-candidate.js";
import type { ImportReport } from "./package-import.dto.js";
import {
  exportedSnapshot,
  findRevision,
  requireImportTarget,
  saveImport,
  type StoredPackageContent,
} from "./package-import.service.js";
import { loadContentFiles } from "./package-content-files.js";
import type { DataPackageDto } from "./data-package.dto.js";
import { createDataPackage, getDataPackage } from "./data-packages.service.js";
import { DEFAULT_STYLE } from "./package-objects.service.js";
import type { PackageSnapshot } from "./package-snapshot.js";

/** Report label for one archive entry: `<uid>/<uid>.cot` becomes `<uid>.cot`. */
function entryLabel(path: string): string {
  return path.split("/").at(-1) ?? path;
}

type ArchiveContent = ReturnType<typeof readDataPackage>["contentFiles"];

function convertDataPackage(bytes: Uint8Array): {
  name: string | null;
  conversion: ImportConversion;
  contents: ArchiveContent;
} {
  const archive = readDataPackage(bytes);
  const conversion = emptyConversion();
  conversion.report.skipped.push(...archive.skipped);
  conversion.report.retained.push(
    ...archive.contentFiles.map((file) => ({ feature: file.path, message: "Retained unchanged as ATAK map content." })),
  );

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
  return { name: archive.name, conversion, contents: archive.contentFiles };
}

async function storeContents(contents: ArchiveContent): Promise<StoredPackageContent[]> {
  const stored: StoredPackageContent[] = [];
  try {
    for (const content of contents) {
      const storageKey = await writeBlob(content.bytes);
      stored.push({
        id: randomUUID(),
        blobId: randomUUID(),
        storageKey,
        sha256: createHash("sha256").update(content.bytes).digest("hex"),
        size: content.bytes.length,
        mediaType: content.mediaType,
        kind: content.kind,
        name: content.name,
        archivePath: content.path,
      });
    }
    return stored;
  } catch (error: unknown) {
    await Promise.all(stored.map(({ storageKey }) => removeBlob(storageKey)));
    throw error;
  }
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
  const { conversion, contents } = convertDataPackage(bytes);
  const stored = await storeContents(contents);
  try {
    return await saveImport(actor, eventId, packageId, layerId, conversion, "atak", stored);
  } catch (error: unknown) {
    await Promise.all(stored.map(({ storageKey }) => removeBlob(storageKey)));
    throw error;
  }
}

export interface ImportedDataPackage {
  dataPackage: DataPackageDto;
  report: ImportReport;
}

const MAX_PACKAGE_NAME = 100;

/** Manifest name first, then the uploaded file name without its extension. */
function importedName(manifestName: string | null, fileName: string | undefined): string {
  const fromFile = fileName?.replace(/\.(zip|dpk|cot|xml)$/i, "").trim();
  const name = manifestName?.trim() || fromFile || "Imported data package";
  return name.slice(0, MAX_PACKAGE_NAME);
}

/**
 * Creates a new data package from an ATAK Data Package and imports it into the first layer. The
 * archive is read before anything is created, and a failed import removes the new package again,
 * so a rejected upload never leaves an empty package behind.
 */
export async function importAtakAsNewPackage(
  actor: ActorContext,
  eventId: string,
  bytes: Uint8Array,
  fileName?: string,
): Promise<ImportedDataPackage> {
  const { name, conversion, contents } = convertDataPackage(bytes);
  const created = await createDataPackage(actor, eventId, { name: importedName(name, fileName) });
  const layer = await database.packageLayer.findFirstOrThrow({ where: { packageId: created.id }, orderBy: { sortOrder: "asc" } });
  const stored = await storeContents(contents);
  try {
    const report = await saveImport(actor, eventId, created.id, layer.id, conversion, "atak", stored);
    return { dataPackage: await getDataPackage(actor.principal, eventId, created.id), report };
  } catch (error: unknown) {
    await Promise.all(stored.map(({ storageKey }) => removeBlob(storageKey)));
    await database.dataPackage.delete({ where: { id: created.id } });
    throw error;
  }
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
export async function buildAtakExport(packageId: string, revision: PackageRevision, layerId?: string): Promise<AtakExport> {
  const snapshot = exportedSnapshot(revision.snapshot as unknown as PackageSnapshot, layerId);
  const files = await loadContentFiles(snapshot.contents ?? []);
  const bytes = writeDataPackage(
    {
      uid: layerId ?? packageId,
      name: snapshot.name,
      events: snapshot.objects.map((object) => ({ uid: object.id, xml: objectToCot(object, revision.createdAt) })),
      files,
    },
    revision.createdAt,
  );
  const safeName = snapshot.name.replace(/[^\w.-]+/g, "_").slice(0, 80) || "data-package";
  return { fileName: `${safeName}-r${String(revision.number)}.zip`, bytes };
}
