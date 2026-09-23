import { randomUUID } from "node:crypto";
import { Prisma } from "../../generated/prisma/client.js";
import { recordAudit } from "../../shared/audit/audit.js";
import type { ActorContext } from "../../shared/auth/principal.js";
import { database } from "../../shared/database/database.js";
import { ProblemError } from "../../shared/errors/problem-error.js";
import { requireEventPermission } from "../events/event-access.js";
import { planCombinedExport } from "./combined-export.service.js";
import type { DataPackageDto } from "./data-package.dto.js";
import { requireEditableEvent } from "./data-package-access.js";
import { loadDto } from "./data-packages.service.js";
import { MAX_LAYERS_PER_PACKAGE } from "./package-layers.service.js";
import { MAX_OBJECTS_PER_PACKAGE } from "./package-objects.service.js";
import { nextPackageSortOrder } from "./package-order.js";
import type { CreateDataPackageCopyRequest } from "./package-copy.dto.js";

function limitProblem(kind: "layers" | "objects", maximum: number): ProblemError {
  return new ProblemError({
    type: `urn:openmeshtak:problem:too-many-${kind}`,
    title: `Too many ${kind}`,
    status: 409,
    detail: `A data package can have at most ${String(maximum)} ${kind}. Select less content.`,
    code: `TOO_MANY_${kind.toUpperCase()}`,
  });
}

/**
 * Copies published content into an independent editable package. Every layer and object receives a
 * new UUID, while immutable source rows retain the exact revisions and original layer IDs.
 */
export async function createDataPackageCopy(
  actor: ActorContext,
  eventId: string,
  input: CreateDataPackageCopyRequest,
): Promise<DataPackageDto> {
  requireEditableEvent(await requireEventPermission(actor.principal, eventId, "data-packages.edit"));
  const { parts } = await planCombinedExport(actor.principal, eventId, input);
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
    await transaction.dataPackage.create({
      data: {
        id: packageId,
        eventId,
        name: input.name,
        description: input.description ?? null,
        sortOrder: await nextPackageSortOrder(transaction, eventId),
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
            geometry: object.geometry as unknown as Prisma.InputJsonValue,
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

      await transaction.dataPackageSource.create({
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
            revision: revision.number,
            layerIds: snapshot.layers.map(({ id }) => id),
          })),
        },
      },
      transaction,
    );
  });

  return loadDto(packageId);
}
