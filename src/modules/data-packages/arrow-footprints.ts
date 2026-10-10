import { directGeodesic, inverseGeodesic } from "./geodesic.js";
import type { PolygonGeometry } from "./package-object.dto.js";
import type { PackageSnapshotObject } from "./package-snapshot.js";
import { nativePlanning } from "./atak/native-planning.js";

/** Static associated arrowheads for paths without a confirmed native arrow contract.
 * Their geographic size is bounded by the adjacent segment; screen-pixel sizing is not portable.
 */
export function arrowFootprints(object: PackageSnapshotObject, useNative = true): Array<{ suffix: string; geometry: PolygonGeometry }> {
  if (object.geometry.type !== "LineString" || (object.style.arrowHeads ?? "none") === "none") return [];
  const coordinates = object.geometry.coordinates;
  if (useNative && nativePlanning(object)?.type === "u-rb-a" && object.style.arrowHeads !== "both") return [];
  const result: Array<{ suffix: string; geometry: PolygonGeometry }> = [];
  const add = (suffix: string, tip: number[], neighbour: number[]) => {
    const back = inverseGeodesic(tip, neighbour);
    if (back.metres <= 0) return;
    const size = Math.min(100, back.metres * 0.2);
    const left = directGeodesic(tip, size, back.bearing - 25), right = directGeodesic(tip, size, back.bearing + 25);
    result.push({ suffix, geometry: { type: "Polygon", coordinates: [[tip.slice(0, 2), left, right, tip.slice(0, 2)]] } });
  };
  const start = coordinates[0]!, end = coordinates.at(-1)!;
  if (["start", "both"].includes(object.style.arrowHeads ?? "none")) {
    const next = coordinates.find((p) => p[0] !== start[0] || p[1] !== start[1]);
    if (next !== undefined) add("head-start", start, next);
  }
  if (["end", "both"].includes(object.style.arrowHeads ?? "none") && (!useNative || nativePlanning(object)?.type !== "u-rb-a")) {
    const previous = [...coordinates].reverse().find((p) => p[0] !== end[0] || p[1] !== end[1]);
    if (previous !== undefined) add("head-end", end, previous);
  }
  return result;
}
