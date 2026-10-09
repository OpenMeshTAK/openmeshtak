import type { Prisma } from "../../generated/prisma/client.js";
import { database } from "../../shared/database/database.js";
import type { DataPackageContentSummary } from "./data-package.dto.js";
import { estimateAtakExportSize } from "./package-export-size.js";
import { buildPackageSnapshot, hashPackageSnapshot, type PackageSnapshot } from "./package-snapshot.js";

/*
 * Derived package state for the package list, cached so listing does not rebuild every draft:
 * - `DataPackage.draftHash` is cleared on every draft change and recomputed on the next read.
 * - `PackageRevision.exportSize` is stored at publish; older revisions get it on their first read.
 * Publishing never trusts these caches; it always compares the real snapshot.
 */

/**
 * Forgets the cached draft hash after any change to a package's draft (name, layers, objects or
 * content). Also moves the package's `updatedAt`, which therefore follows draft edits.
 */
export async function clearDraftHash(client: Prisma.TransactionClient, packageId: string): Promise<void> {
  await client.dataPackage.update({ where: { id: packageId }, data: { draftHash: null } });
}

/** Returns the cached draft hash, computing and storing it when a change cleared it. */
export async function draftHashOf(row: { id: string; draftHash: string | null; updatedAt: Date }): Promise<string> {
  if (row.draftHash !== null) {
    return row.draftHash;
  }
  const hash = hashPackageSnapshot(await buildPackageSnapshot(database, row.id));
  // A draft change in the meantime moves `updatedAt`, so this never stores the hash of an older
  // draft. Keeping `updatedAt` stops the cache write from looking like an edit.
  await database.dataPackage.updateMany({
    where: { id: row.id, draftHash: null, updatedAt: row.updatedAt },
    data: { draftHash: hash, updatedAt: row.updatedAt },
  });
  return hash;
}

/** Returns a revision's stored download estimate, filling it in for revisions published before it existed. */
export async function exportSizeOf(revision: { id: string; exportSize: number | null }): Promise<number> {
  if (revision.exportSize !== null) {
    return revision.exportSize;
  }
  const { snapshot, createdAt } = await database.packageRevision.findUniqueOrThrow({
    where: { id: revision.id },
    select: { snapshot: true, createdAt: true },
  });
  // Written only by the publish service from a built snapshot.
  const exportSize = estimateAtakExportSize(snapshot as unknown as PackageSnapshot, createdAt);
  await database.packageRevision.update({ where: { id: revision.id }, data: { exportSize } });
  return exportSize;
}

const EMPTY_SUMMARY: DataPackageContentSummary = {
  points: 0,
  lines: 0,
  polygons: 0,
  circles: 0,
  rectangles: 0,
  ellipses: 0,
  routes: 0,
  offlineMaps: 0,
  rubberSheets: 0,
};

const OBJECT_KINDS: Record<string, keyof DataPackageContentSummary> = {
  point: "points",
  line: "lines",
  polygon: "polygons",
  circle: "circles",
  rectangle: "rectangles",
  ellipse: "ellipses",
  route: "routes",
};

const CONTENT_KINDS: Record<string, keyof DataPackageContentSummary> = {
  "offline-map": "offlineMaps",
  "nested-data-package": "offlineMaps",
  "rubber-sheet": "rubberSheets",
};

/** Counts each package's draft objects and map content by kind with two grouped queries. */
export async function contentSummaries(packageIds: string[]): Promise<Map<string, DataPackageContentSummary>> {
  const summaries = new Map(packageIds.map((id) => [id, { ...EMPTY_SUMMARY }]));
  const where = { packageId: { in: packageIds } };
  const [objects, contents] = await Promise.all([
    database.packageObject.groupBy({ by: ["packageId", "kind"], where, _count: { _all: true } }),
    database.packageContent.groupBy({ by: ["packageId", "kind"], where, _count: { _all: true } }),
  ]);
  const add = (packageId: string, field: keyof DataPackageContentSummary | undefined, count: number) => {
    const summary = summaries.get(packageId);
    if (summary !== undefined && field !== undefined) {
      summary[field] = (summary[field] ?? 0) + count;
    }
  };
  for (const group of objects) {
    add(group.packageId, OBJECT_KINDS[group.kind], group._count._all);
  }
  for (const group of contents) {
    add(group.packageId, CONTENT_KINDS[group.kind], group._count._all);
  }
  return summaries;
}
