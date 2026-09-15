import { createHash } from "node:crypto";
import type { Prisma } from "../../generated/prisma/client.js";
import type { MissionGeometry, MissionObjectKind, MissionObjectStyle } from "./mission-object.dto.js";

/** Version of the snapshot document; bump it when its shape changes. */
export const MISSION_SNAPSHOT_SCHEMA = 1;

export interface MissionSnapshotLayer {
  id: string;
  name: string;
  sortOrder: number;
  visible: boolean;
}

export interface MissionSnapshotObject {
  id: string;
  layerId: string;
  kind: MissionObjectKind;
  name: string;
  description: string | null;
  geometry: MissionGeometry;
  style: MissionObjectStyle;
}

/** Everything a package generator needs; timestamps and versions are left out on purpose. */
export interface MissionSnapshot {
  schema: number;
  name: string;
  description: string | null;
  layers: MissionSnapshotLayer[];
  objects: MissionSnapshotObject[];
}

/**
 * Reads the draft in a fixed order (layers by `sortOrder`, objects by layer order and creation) so
 * an unchanged mission always serializes to the same JSON and therefore the same hash.
 */
export async function buildMissionSnapshot(
  transaction: Prisma.TransactionClient,
  missionId: string,
): Promise<MissionSnapshot> {
  const mission = await transaction.missionProject.findUniqueOrThrow({
    where: { id: missionId },
    select: {
      name: true,
      description: true,
      layers: { orderBy: [{ sortOrder: "asc" }, { id: "asc" }] },
      objects: { orderBy: [{ createdAt: "asc" }, { id: "asc" }] },
    },
  });
  const layerPosition = new Map(mission.layers.map(({ id }, index) => [id, index]));
  const objects = [...mission.objects].sort(
    (a, b) => (layerPosition.get(a.layerId) ?? 0) - (layerPosition.get(b.layerId) ?? 0),
  );

  return {
    schema: MISSION_SNAPSHOT_SCHEMA,
    name: mission.name,
    description: mission.description,
    layers: mission.layers.map(({ id, name, sortOrder, visible }) => ({ id, name, sortOrder, visible })),
    objects: objects.map((object) => ({
      id: object.id,
      layerId: object.layerId,
      kind: object.kind as MissionObjectKind,
      name: object.name,
      description: object.description,
      // Written only by the objects service after validation.
      geometry: object.geometry as unknown as MissionGeometry,
      style: object.style as unknown as MissionObjectStyle,
    })),
  };
}

export function hashMissionSnapshot(snapshot: MissionSnapshot): string {
  return createHash("sha256").update(JSON.stringify(snapshot), "utf8").digest("hex");
}
