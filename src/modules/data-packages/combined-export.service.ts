import { createHash } from "node:crypto";
import type { DataPackage, PackageRevision } from "../../generated/prisma/client.js";
import { recordAudit } from "../../shared/audit/audit.js";
import type { ActorContext, Principal } from "../../shared/auth/principal.js";
import { database } from "../../shared/database/database.js";
import { notFoundProblem, ProblemError, validationProblem } from "../../shared/errors/problem-error.js";
import { requireEventPermission } from "../events/event-access.js";
import { objectToCotEvents } from "./atak/cot-export.js";
import { writeDataPackage } from "./atak/data-package-archive.js";
import type {
  CombinedExportNameClash,
  CombinedExportReport,
  CombinedExportRequest,
  CombinedExportSelection,
} from "./combined-export.dto.js";
import type { AtakExport } from "./package-atak.service.js";
import { loadContentFiles, mergeContentFiles } from "./package-content-files.js";
import type { PackageSnapshot } from "./package-snapshot.js";
import { presentationLosses } from "./export-presentation.js";

export interface IncludedPart {
  dataPackage: DataPackage;
  revision: PackageRevision;
  snapshot: PackageSnapshot;
}

export interface CombinedPlan {
  report: CombinedExportReport;
  parts: IncludedPart[];
}

async function findRevision(packageId: string, number: number | undefined): Promise<PackageRevision | null> {
  return number === undefined
    ? database.packageRevision.findFirst({ where: { packageId }, orderBy: { number: "desc" } })
    : database.packageRevision.findUnique({ where: { packageId_number: { packageId, number } } });
}

/** Narrows a snapshot to the chosen layers; an unknown or repeated layer is never silently ignored. */
export function selectedSnapshot(snapshot: PackageSnapshot, selection: CombinedExportSelection, index: number, source = "revision"): PackageSnapshot {
  if (selection.layerIds === undefined) {
    return snapshot;
  }
  if (new Set(selection.layerIds).size !== selection.layerIds.length) {
    throw validationProblem([
      { field: `packages.${String(index)}.layerIds`, code: "DUPLICATE", message: "Select each layer only once." },
    ]);
  }
  const known = new Set(snapshot.layers.map(({ id }) => id));
  if (selection.layerIds.some((id) => !known.has(id))) {
    throw validationProblem([
      { field: `packages.${String(index)}.layerIds`, code: "UNKNOWN_LAYER", message: `Choose layers of this package ${source}.` },
    ]);
  }
  const wanted = new Set(selection.layerIds);
  return {
    ...snapshot,
    layers: snapshot.layers.filter(({ id }) => wanted.has(id)),
    objects: snapshot.objects.filter(({ layerId }) => wanted.has(layerId)),
    contents: snapshot.contents?.filter(({ layerId }) => wanted.has(layerId)) ?? [],
  };
}

function nameClashes(parts: IncludedPart[]): CombinedExportNameClash[] {
  const owners = new Map<string, Set<string>>();
  for (const { dataPackage, snapshot } of parts) {
    for (const { name } of snapshot.objects) {
      const trimmed = name.trim();
      if (trimmed !== "") {
        owners.set(trimmed, (owners.get(trimmed) ?? new Set()).add(dataPackage.id));
      }
    }
  }
  return [...owners]
    .filter(([, packageIds]) => packageIds.size > 1)
    .map(([name, packageIds]) => ({ name, packageIds: [...packageIds].sort() }))
    .sort((left, right) => left.name.localeCompare(right.name));
}

/**
 * Resolves the selection against published revisions. Packages without a published revision are
 * reported as skipped; the same package may not be selected twice.
 */
export async function planCombinedExport(
  principal: Principal,
  eventId: string,
  input: CombinedExportRequest,
): Promise<CombinedPlan> {
  await requireEventPermission(principal, eventId, "data-packages.read");
  const ids = input.packages.map(({ packageId }) => packageId);
  if (new Set(ids).size !== ids.length) {
    throw validationProblem([{ field: "packages", code: "DUPLICATE", message: "Select each data package only once." }]);
  }

  const report: CombinedExportReport = { included: [], skipped: [], nameClashes: [], presentationLosses: [] };
  const parts: IncludedPart[] = [];
  for (const [index, selection] of input.packages.entries()) {
    const dataPackage = await database.dataPackage.findFirst({ where: { id: selection.packageId, eventId } });
    if (dataPackage === null) {
      throw notFoundProblem();
    }
    const revision = await findRevision(dataPackage.id, selection.revision);
    if (revision === null) {
      if (selection.revision !== undefined) {
        throw notFoundProblem();
      }
      report.skipped.push({ packageId: dataPackage.id, name: dataPackage.name, reason: "not-published" });
      continue;
    }
    const snapshot = selectedSnapshot(revision.snapshot as unknown as PackageSnapshot, selection, index);
    parts.push({ dataPackage, revision, snapshot });
    report.included.push({
      packageId: dataPackage.id,
      name: dataPackage.name,
      revision: revision.number,
      objects: snapshot.objects.length,
    });
  }
  report.nameClashes = nameClashes(parts);
  report.presentationLosses = parts.flatMap(({ snapshot }) => snapshot.objects.flatMap((object) => presentationLosses(object, "cot")));
  return { report, parts };
}

export async function previewCombinedExport(
  principal: Principal,
  eventId: string,
  input: CombinedExportRequest,
): Promise<CombinedExportReport> {
  return (await planCombinedExport(principal, eventId, input)).report;
}

/** A stable UID per selection, so importing a newer export of the same selection replaces the old one. */
function combinedUid(eventId: string, parts: IncludedPart[]): string {
  const key = parts
    .map(({ dataPackage }) => dataPackage.id)
    .sort()
    .join(",");
  const hex = createHash("sha256").update(`combined:${eventId}:${key}`).digest("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
}

/**
 * Builds one ATAK Data Package from several published package revisions. Object UIDs are the
 * stored object IDs and therefore unique across packages, so nothing is overwritten; equal names
 * only appear in the report.
 */
export async function exportCombined(
  actor: ActorContext,
  eventId: string,
  input: CombinedExportRequest,
): Promise<AtakExport> {
  const { parts } = await planCombinedExport(actor.principal, eventId, input);
  if (parts.length === 0) {
    throw new ProblemError({
      type: "urn:openmeshtak:problem:nothing-to-export",
      title: "Nothing to export",
      status: 409,
      detail: "None of the selected data packages has a published revision.",
      code: "NOTHING_TO_EXPORT",
    });
  }
  const event = await database.event.findUniqueOrThrow({ where: { id: eventId }, select: { name: true } });
  const name = input.name ?? event.name;
  const modifiedAt = new Date(Math.max(...parts.map(({ revision }) => revision.createdAt.getTime())));

  const files = mergeContentFiles(
    await Promise.all(
      parts.map(async ({ dataPackage, snapshot }) => ({
        packageId: dataPackage.id,
        files: await loadContentFiles(snapshot.contents ?? []),
      })),
    ),
  );
  const bytes = writeDataPackage(
    {
      uid: combinedUid(eventId, parts),
      name,
      events: parts.flatMap(({ revision, snapshot }) =>
        snapshot.objects.flatMap((object) => objectToCotEvents(object, revision.createdAt)),
      ),
      files,
    },
    modifiedAt,
  );

  await recordAudit({
    actor: actor.principal,
    action: "data-package.combined-exported",
    targetType: "event",
    targetId: eventId,
    result: "success",
    traceId: actor.traceId,
    metadata: {
      revisions: parts.map(({ dataPackage, revision }) => ({ packageId: dataPackage.id, revision: revision.number })),
      artifactSha256: createHash("sha256").update(bytes).digest("hex"),
    },
  });

  const safeName = name.replace(/[^\w.-]+/g, "_").slice(0, 80) || "data-packages";
  return { fileName: `${safeName}.zip`, bytes };
}
