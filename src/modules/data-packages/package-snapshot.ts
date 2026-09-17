import { createHash } from "node:crypto";
import type { Prisma } from "../../generated/prisma/client.js";
import type { PackageGeometry, PackageObjectKind, PackageObjectStyle, TakMarker } from "./package-object.dto.js";
import { readTak } from "./tak-marker.js";

/** Version of the snapshot document; bump it when its shape changes. */
export const PACKAGE_SNAPSHOT_SCHEMA = 1;

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

/** Everything a package generator needs; timestamps and versions are left out on purpose. */
export interface PackageSnapshot {
  schema: number;
  name: string;
  description: string | null;
  layers: PackageSnapshotLayer[];
  objects: PackageSnapshotObject[];
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
    objects: objects.map((object) => ({
      id: object.id,
      layerId: object.layerId,
      kind: object.kind as PackageObjectKind,
      name: object.name,
      description: object.description,
      // Written only by the objects service after validation.
      geometry: object.geometry as unknown as PackageGeometry,
      style: object.style as unknown as PackageObjectStyle,
      tak: readTak(object.tak),
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
  };
}
