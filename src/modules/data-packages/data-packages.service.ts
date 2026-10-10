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
import { referencedBlobIds, removeUnreferencedBlobs } from "./package-content-cleanup.js";
import { nextPackageSortOrder, requireUniqueMissionName } from "./package-order.js";
import { contentSummaries, draftHashOf, exportSizeOf } from "./package-state.js";
import { audienceFromSelectors } from "../event-audience/event-audience.js";
import type {
  CreateDataPackageRequest,
  DataPackageContentSummary,
  DataPackageDto,
  DataPackageKind,
  DataPackagePage,
  UpdateDataPackageRequest,
} from "./data-package.dto.js";
import { readableKinds, requireDataPackage, requireEditableEvent, requireKindPermission } from "./data-package-access.js";

const packageSelection = {
  id: true,
  eventId: true,
  kind: true,
  name: true,
  description: true,
  version: true,
  sortOrder: true,
  writers: true,
  audienceAll: true,
  audience: true,
  installOnEnrollment: true,
  installOnConnection: true,
  createdAt: true,
  updatedAt: true,
  draftHash: true,
  revisions: {
    select: { id: true, number: true, snapshotHash: true, exportSize: true },
    orderBy: { number: "desc" },
    take: 1,
  },
  sources: { orderBy: [{ createdAt: "asc" }, { id: "asc" }] },
} satisfies Prisma.DataPackageSelect;

type PackageRow = Prisma.DataPackageGetPayload<{ select: typeof packageSelection }>;

async function toDto(row: PackageRow, draftContents: DataPackageContentSummary): Promise<DataPackageDto> {
  const latest = row.revisions[0];
  return {
    id: row.id,
    eventId: row.eventId,
    kind: row.kind === "mission" ? "mission" : "package",
    name: row.name,
    description: row.description,
    latestRevision: latest?.number ?? null,
    latestRevisionSize: latest === undefined ? null : await exportSizeOf(latest),
    // The same hash comparison publishing uses, so this is exactly "publishing creates a revision".
    hasUnpublishedChanges: latest === undefined || (await draftHashOf(row)) !== latest.snapshotHash,
    draftContents,
    sources: row.sources.map((source) => ({
      id: source.id,
      sourcePackageId: source.sourcePackageId,
      sourcePackageName: source.sourcePackageName,
      sourceRevision: source.sourceRevision,
      sourceSnapshotHash: source.sourceSnapshotHash,
      // Written only by the package-copy service from UUIDs selected in a validated snapshot.
      sourceLayerIds: source.sourceLayerIds as string[],
      createdAt: source.createdAt.toISOString(),
    })),
    audience: { allMembers: row.audienceAll, ...audienceFromSelectors(row.audience) },
    writers: audienceFromSelectors(row.writers),
    takDelivery: { onEnrollment: row.installOnEnrollment, onConnection: row.installOnConnection },
    sortOrder: row.sortOrder,
    version: row.version,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

async function toDtos(rows: PackageRow[]): Promise<DataPackageDto[]> {
  const summaries = await contentSummaries(rows.map(({ id }) => id));
  return Promise.all(rows.map((row) => toDto(row, summaries.get(row.id)!)));
}

export async function loadDto(packageId: string): Promise<DataPackageDto> {
  const row = await database.dataPackage.findUniqueOrThrow({ where: { id: packageId }, select: packageSelection });
  const [dto] = await toDtos([row]);
  return dto!;
}

function audit(actor: ActorContext, action: string, packageId: string, eventId: string) {
  return {
    actor: actor.principal,
    action,
    targetType: "data-package",
    targetId: packageId,
    result: "success" as const,
    traceId: actor.traceId,
    metadata: { eventId },
  };
}

export async function listDataPackages(
  principal: Principal,
  eventId: string,
  limit = DEFAULT_PAGE_LIMIT,
  cursor?: string,
  kind?: DataPackageKind,
): Promise<DataPackagePage> {
  const kinds = kind === undefined ? await readableKinds(principal, eventId) : [kind];
  if (kind !== undefined) {
    await requireKindPermission(principal, eventId, "data-packages.read", kind);
  }
  const context = `events/${eventId}/data-packages/${kind ?? "all"}`;
  const position = cursor === undefined ? null : decodeCursor(context, cursor);

  const rows = await database.dataPackage.findMany({
    where: { eventId, kind: { in: kinds }, ...afterCursor(position) },
    orderBy: [...CURSOR_ORDER],
    take: limit + 1,
    select: packageSelection,
  });
  const page = toPage(context, rows, limit, (row) => row);
  return { ...page, items: await toDtos(page.items) };
}

export async function getDataPackage(principal: Principal, eventId: string, packageId: string): Promise<DataPackageDto> {
  await requireDataPackage(principal, eventId, packageId, "data-packages.read");
  return loadDto(packageId);
}

/** New data packages and missions start with one empty layer so the editor can draw immediately. */
export async function createDataPackage(
  actor: ActorContext,
  eventId: string,
  input: CreateDataPackageRequest,
): Promise<DataPackageDto> {
  requireEditableEvent(await requireKindPermission(actor.principal, eventId, "data-packages.edit", input.kind ?? "package"));

  const packageId = randomUUID();
  await database.$transaction(async (transaction) => {
    if (input.kind === "mission") {
      await requireUniqueMissionName(transaction, eventId, input.name);
    }
    await transaction.dataPackage.create({
      data: {
        id: packageId,
        eventId,
        sortOrder: await nextPackageSortOrder(transaction, eventId, input.kind ?? "package"),
        kind: input.kind ?? "package",
        name: input.name,
        description: input.description ?? null,
        layers: { create: { id: randomUUID(), name: "Layer 1", sortOrder: 0 } },
      },
    });
    await recordAudit(audit(actor, "data-package.created", packageId, eventId), transaction);
  });
  return loadDto(packageId);
}

export async function updateDataPackage(
  actor: ActorContext,
  eventId: string,
  packageId: string,
  input: UpdateDataPackageRequest,
): Promise<DataPackageDto> {
  const { event, dataPackage } = await requireDataPackage(actor.principal, eventId, packageId, "data-packages.edit");
  requireEditableEvent(event);
  if (dataPackage.kind === "mission") {
    await requireUniqueMissionName(database, eventId, input.name, packageId);
  }

  const updated = await database.dataPackage.updateMany({
    where: { id: packageId, eventId, version: input.version },
    data: { name: input.name, description: input.description, draftHash: null, version: { increment: 1 } },
  });
  if (updated.count !== 1) {
    const latest = await database.dataPackage.findUnique({ where: { id: packageId }, select: { version: true } });
    throw latest === null ? notFoundProblem() : versionConflictProblem(latest.version);
  }
  return loadDto(packageId);
}

/** Deletes the draft and its published revisions. */
export async function deleteDataPackage(actor: ActorContext, eventId: string, packageId: string): Promise<void> {
  const { event } = await requireDataPackage(actor.principal, eventId, packageId, "data-packages.edit");
  requireEditableEvent(event);
  const blobIds = await referencedBlobIds(packageId);

  await database.$transaction(async (transaction) => {
    await transaction.dataPackage.delete({ where: { id: packageId } });
    await recordAudit(audit(actor, "data-package.deleted", packageId, eventId), transaction);
  });
  await removeUnreferencedBlobs(eventId, blobIds);
}
