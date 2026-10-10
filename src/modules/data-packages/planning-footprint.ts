import buffer from "@turf/buffer";
import sector from "@turf/sector";
import circle from "@turf/circle";
import { shapeFootprint } from "./shape-footprint.js";
import { arrowFootprints } from "./arrow-footprints.js";
import type { PackageGeometry, PackageObjectStyle, PolygonGeometry } from "./package-object.dto.js";

/** Derived export geometry only. Canonical centre/source and presentation never get replaced. */
export function planningFootprint(geometry: PackageGeometry, style: PackageObjectStyle): PolygonGeometry | null {
  if (geometry.type === "Point" && style.sector != null) {
    const { radius, heading, sweep } = style.sector;
    return sector(geometry.coordinates, radius, heading - sweep / 2, heading + sweep / 2, { units: "meters", steps: 64 }).geometry;
  }
  if ((geometry.type === "LineString" || geometry.type === "Route") && style.corridorWidth != null) {
    const result = buffer({ type: "LineString", coordinates: geometry.coordinates }, style.corridorWidth / 2, { units: "meters", steps: 8 });
    if (result?.geometry.type !== "Polygon") throw new Error("The corridor must form one connected polygon.");
    return result.geometry;
  }
  return null;
}

export function safeDistanceFootprint(geometry: PackageGeometry, metres: number): PolygonGeometry | null {
  if (geometry.type === "Point" || geometry.type === "Route") return null;
  const source = geometry.type === "Circle" ? circle(geometry.coordinates, geometry.radius, { steps: 64, units: "meters" }).geometry
    : geometry.type === "Ellipse" || geometry.type === "Rectangle" ? shapeFootprint(geometry) : geometry;
  const result = buffer(source, metres, { units: "meters", steps: 8 });
  if (result?.geometry.type !== "Polygon") throw new Error("The safe distance must form one connected polygon.");
  return result.geometry;
}

/** Includes outer rings and safety boundaries so none escape the normal geometry limits. */
export function planningValidationGeometry(geometry: PackageGeometry, style: PackageObjectStyle): PackageGeometry[] {
  const footprint = planningFootprint(geometry, style);
  const result: PackageGeometry[] = footprint === null ? [] : [footprint];
  if (geometry.type === "LineString") result.push(...arrowFootprints({ id: "validation", layerId: "validation", name: "", description: null, tak: null, kind: "line", geometry, style }, false).map(({ geometry: head }) => head));
  if (geometry.type === "Circle") {
    const radius = Math.max(geometry.radius * (style.rangeCircle === true ? style.rangeRings ?? 1 : 1), style.bullseye?.ringsVisible === true ? style.bullseye.ringDistance * style.bullseye.ringCount : 0);
    result.push({ ...geometry, radius });
  }
  if (style.minimumSafeDistance != null) {
    const boundary = safeDistanceFootprint(geometry, style.minimumSafeDistance);
    if (boundary !== null) result.push(boundary);
  }
  return result;
}
