import { createHash } from "node:crypto";
import type { PackageObject, Prisma } from "../../generated/prisma/client.js";
import type { PackageGeometry, PackageObjectKind, PackageObjectStyle, TakMarker } from "./package-object.dto.js";
import { readTak } from "./tak-marker.js";

/** Version of the snapshot document; bump it when its shape changes. */
export const PACKAGE_SNAPSHOT_SCHEMA = 2;

export interface PackageSnapshotLayer {
  id: string;
  name: string;
  sortOrder: number;
  visible: boolean;
}

export interface PackageSnapshotObject {
  id: string;
  layerId: string;
  kind: PackageObjectKind;
  name: string;
  description: string | null;
  geometry: PackageGeometry;
  style: PackageObjectStyle;
  tak: TakMarker | null;
}

export interface PackageSnapshotContent {
  id: string;
  layerId: string;
  blobId: string;
  kind: string;
  name: string;
  archivePath: string;
  sha256: string;
  size: number;
  mediaType: string;
  /** Rubber-sheet placement and similar display data; absent for plain files. */
  metadata?: unknown;
}

/** Everything a package generator needs; timestamps and versions are left out on purpose. */
export interface PackageSnapshot {
  schema: number;
  name: string;
  description: string | null;
  layers: PackageSnapshotLayer[];
  objects: PackageSnapshotObject[];
  /** Missing only on schema-1 revisions created before package content existed. */
  contents?: PackageSnapshotContent[];
}

/** How one stored object appears in a snapshot. */
export function snapshotObjectOf(object: PackageObject): PackageSnapshotObject {
  return {
    id: object.id,
    layerId: object.layerId,
    kind: object.kind as PackageObjectKind,
    name: object.name,
    description: object.description,
    // Written only by the objects service after validation.
    geometry: object.geometry as unknown as PackageGeometry,
    style: object.style as unknown as PackageObjectStyle,
    tak: readTak(object.tak),
  };
}

/**
 * Reads the draft in a fixed order (layers by `sortOrder`, objects by layer order and creation) so
 * an unchanged data package always serializes to the same JSON and therefore the same hash.
 */
export async function buildPackageSnapshot(
  transaction: Prisma.TransactionClient,
  packageId: string,
): Promise<PackageSnapshot> {
  const dataPackage = await transaction.dataPackage.findUniqueOrThrow({
    where: { id: packageId },
    select: {
      name: true,
      description: true,
      layers: { orderBy: [{ sortOrder: "asc" }, { id: "asc" }] },
      objects: { orderBy: [{ createdAt: "asc" }, { id: "asc" }] },
      contents: { orderBy: [{ createdAt: "asc" }, { id: "asc" }], include: { blob: true } },
    },
  });
  const layerPosition = new Map(dataPackage.layers.map(({ id }, index) => [id, index]));
  const objects = [...dataPackage.objects].sort(
    (a, b) => (layerPosition.get(a.layerId) ?? 0) - (layerPosition.get(b.layerId) ?? 0),
  );

  return {
    schema: PACKAGE_SNAPSHOT_SCHEMA,
    name: dataPackage.name,
    description: dataPackage.description,
    layers: dataPackage.layers.map(({ id, name, sortOrder, visible }) => ({ id, name, sortOrder, visible })),
    objects: objects.map(snapshotObjectOf),
    contents: dataPackage.contents.map((content) => ({
      id: content.id,
      layerId: content.layerId,
      blobId: content.blobId,
      kind: content.kind,
      name: content.name,
      archivePath: content.archivePath,
      sha256: content.blob.sha256,
      size: content.blob.size,
      mediaType: content.blob.mediaType,
      ...(content.metadata === null ? {} : { metadata: content.metadata }),
    })),
  };
}

export function hashPackageSnapshot(snapshot: PackageSnapshot): string {
  return createHash("sha256").update(JSON.stringify(snapshot), "utf8").digest("hex");
}

/** Narrows a snapshot to one layer for per-layer exports; `null` when the layer is not in it. */
export function snapshotOfLayer(snapshot: PackageSnapshot, layerId: string): PackageSnapshot | null {
  const layer = snapshot.layers.find(({ id }) => id === layerId);
  if (layer === undefined) {
    return null;
  }
  return {
    ...snapshot,
    name: `${snapshot.name} - ${layer.name}`,
    layers: [layer],
    objects: snapshot.objects.filter((object) => object.layerId === layerId),
    contents: snapshot.contents?.filter((content) => content.layerId === layerId) ?? [],
  };
}
