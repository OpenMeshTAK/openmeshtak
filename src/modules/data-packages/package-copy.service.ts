import { randomUUID } from "node:crypto";
import { Prisma, type DataPackage, type PackageRevision } from "../../generated/prisma/client.js";
import { recordAudit } from "../../shared/audit/audit.js";
import type { ActorContext } from "../../shared/auth/principal.js";
import { database } from "../../shared/database/database.js";
import { notFoundProblem, ProblemError, validationProblem } from "../../shared/errors/problem-error.js";
import { requireEventPermission } from "../events/event-access.js";
import { planCombinedExport, selectedSnapshot } from "./combined-export.service.js";
import { buildPackageSnapshot, hashPackageSnapshot, type PackageSnapshot } from "./package-snapshot.js";
import type { DataPackageDto } from "./data-package.dto.js";
import { requireEditableEvent } from "./data-package-access.js";
import { loadDto } from "./data-packages.service.js";
import { MAX_LAYERS_PER_PACKAGE } from "./package-layers.service.js";
import { MAX_OBJECTS_PER_PACKAGE } from "./package-objects.service.js";
import { nextPackageSortOrder, requireUniqueMissionName } from "./package-order.js";
import type { CreateDataPackageCopyRequest } from "./package-copy.dto.js";
import { copyGeometry } from "./route-geometry.js";

function limitProblem(kind: "layers" | "objects", maximum: number): ProblemError {
  return new ProblemError({
    type: `urn:openmeshtak:problem:too-many-${kind}`,
    title: `Too many ${kind}`,
    status: 409,
    detail: `A data package can have at most ${String(maximum)} ${kind}. Select less content.`,
    code: `TOO_MANY_${kind.toUpperCase()}`,
  });
}

interface CopyPart { dataPackage: DataPackage; revision: PackageRevision | null; snapshot: PackageSnapshot }

/** A draft has no published revision identity. Read it consistently and audit its snapshot hash. */
async function draftParts(actor: ActorContext, eventId: string, input: CreateDataPackageCopyRequest): Promise<CopyPart[]> {
  await requireEventPermission(actor.principal, eventId, "data-packages.read");
  if (new Set(input.packages.map(({ packageId }) => packageId)).size !== input.packages.length || input.packages.some(({ revision }) => revision !== undefined)) {
    throw validationProblem([{ field: "packages", code: "INVALID_SELECTION", message: "Select each draft once, without a published revision number." }]);
  }
  return database.$transaction(async (transaction) => {
    const parts: CopyPart[] = [];
    for (const [index, selection] of input.packages.entries()) {
      const dataPackage = await transaction.dataPackage.findFirst({ where: { id: selection.packageId, eventId } });
      if (dataPackage === null) throw notFoundProblem();
      const snapshot = selectedSnapshot(await buildPackageSnapshot(transaction, dataPackage.id), selection, index, "draft");
      parts.push({ dataPackage, revision: null, snapshot });
    }
    return parts;
  });
}

/**
 * Copies explicitly selected drafts or published content into an independent editable package.
 * Immutable published provenance is retained; draft provenance is audited without inventing a revision.
 */
export async function createDataPackageCopy(
  actor: ActorContext,
  eventId: string,
  input: CreateDataPackageCopyRequest,
): Promise<DataPackageDto> {
  requireEditableEvent(await requireEventPermission(actor.principal, eventId, "data-packages.edit"));
  const parts: CopyPart[] = input.source === "draft" ? await draftParts(actor, eventId, input) : (await planCombinedExport(actor.principal, eventId, input)).parts;
  if (parts.length === 0) {
    throw new ProblemError({
      type: "urn:openmeshtak:problem:nothing-to-copy",
      title: "Nothing to copy",
      status: 409,
      detail: "None of the selected data packages has a published revision.",
      code: "NOTHING_TO_COPY",
    });
  }

  const layerCount = parts.reduce((sum, { snapshot }) => sum + snapshot.layers.length, 0);
  const objectCount = parts.reduce((sum, { snapshot }) => sum + snapshot.objects.length, 0);
  if (layerCount > MAX_LAYERS_PER_PACKAGE) {
    throw limitProblem("layers", MAX_LAYERS_PER_PACKAGE);
  }
  if (objectCount > MAX_OBJECTS_PER_PACKAGE) {
    throw limitProblem("objects", MAX_OBJECTS_PER_PACKAGE);
  }

  const packageId = randomUUID();
  await database.$transaction(async (transaction) => {
    if (input.kind === "mission") {
      await requireUniqueMissionName(transaction, eventId, input.name);
    }
    await transaction.dataPackage.create({
      data: {
        id: packageId,
        eventId,
        kind: input.kind ?? "package",
        name: input.name,
        description: input.description ?? null,
        sortOrder: await nextPackageSortOrder(transaction, eventId, input.kind ?? "package"),
      },
    });

    let sortOrder = 0;
    for (const part of parts) {
      const layerIds = new Map<string, string>();
      for (const layer of part.snapshot.layers) {
        const layerId = randomUUID();
        layerIds.set(layer.id, layerId);
        await transaction.packageLayer.create({
          data: { id: layerId, packageId, name: layer.name, sortOrder, visible: layer.visible },
        });
        sortOrder += 1;
      }

      if (part.snapshot.objects.length > 0) {
        await transaction.packageObject.createMany({
          data: part.snapshot.objects.map((object) => ({
            id: randomUUID(),
            packageId,
            layerId: layerIds.get(object.layerId)!,
            kind: object.kind,
            name: object.name,
            description: object.description,
            geometry: copyGeometry(object.geometry) as unknown as Prisma.InputJsonValue,
            style: object.style as unknown as Prisma.InputJsonValue,
            tak: object.tak === null ? Prisma.JsonNull : (object.tak as unknown as Prisma.InputJsonValue),
          })),
        });
      }

      // Stored map content is immutable, so the copy references the same blob instead of
      // duplicating large tile caches.
      const contents = part.snapshot.contents ?? [];
      if (contents.length > 0) {
        await transaction.packageContent.createMany({
          data: contents.map((content) => ({
            id: randomUUID(),
            packageId,
            layerId: layerIds.get(content.layerId)!,
            blobId: content.blobId,
            kind: content.kind,
            name: content.name,
            archivePath: content.archivePath,
            metadata: content.metadata === undefined ? Prisma.JsonNull : (content.metadata as Prisma.InputJsonValue),
          })),
        });
      }

      if (part.revision !== null) await transaction.dataPackageSource.create({
        data: {
          id: randomUUID(),
          packageId,
          sourcePackageId: part.dataPackage.id,
          sourcePackageName: part.dataPackage.name,
          sourceRevision: part.revision.number,
          sourceSnapshotHash: part.revision.snapshotHash,
          sourceLayerIds: part.snapshot.layers.map(({ id }) => id),
        },
      });
    }

    await recordAudit(
      {
        actor: actor.principal,
        action: "data-package.copied",
        targetType: "data-package",
        targetId: packageId,
        result: "success",
        traceId: actor.traceId,
        metadata: {
          eventId,
          sources: parts.map(({ dataPackage, revision, snapshot }) => ({
            packageId: dataPackage.id,
            revision: revision?.number ?? null,
            source: revision === null ? "draft" : "published",
            snapshotHash: revision?.snapshotHash ?? hashPackageSnapshot(snapshot),
            layerIds: snapshot.layers.map(({ id }) => id),
          })),
        },
      },
      transaction,
    );
  });

  return loadDto(packageId);
}
