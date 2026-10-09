import ellipse from "@turf/ellipse";
import type { EllipseGeometry, RectangleGeometry, PolygonGeometry } from "./package-object.dto.js";

/** Export/display approximation only; the canonical ellipse keeps its exact axes and rotation. */
export function shapeFootprint(geometry: EllipseGeometry | RectangleGeometry): PolygonGeometry {
  if (geometry.type === "Rectangle") {
    return { type: "Polygon", coordinates: [[...geometry.coordinates, geometry.coordinates[0] ?? []]] };
  }
  const polygon = ellipse(geometry.coordinates, geometry.major, geometry.minor, {
    units: "meters", steps: 64, angle: geometry.rotation + 90,
  });
  return { type: "Polygon", coordinates: polygon.geometry.coordinates };
}

/**
 * Corners must form a rectangle in the local tangent plane. A small tolerance allows geodesic
 * corner rounding in TAK exports; the editor's constrained corner drags preserve right angles.
 */
export function rectangularCorners(corners: number[][]): boolean {
  if (corners.length !== 4) return false;
  const latitude = corners.reduce((sum, p) => sum + (p[1] ?? 0), 0) / 4;
  const longitudeScale = Math.cos(latitude * Math.PI / 180);
  const edges = corners.map((p, index) => {
    const next = corners[(index + 1) % 4] ?? [];
    return [((next[0] ?? 0) - (p[0] ?? 0)) * longitudeScale, (next[1] ?? 0) - (p[1] ?? 0)];
  });
  return edges.every((a, index) => {
    const b = edges[(index + 1) % 4] ?? [];
    const opposite = edges[(index + 2) % 4] ?? [];
    const length = Math.hypot(a[0] ?? 0, a[1] ?? 0);
    const nextLength = Math.hypot(b[0] ?? 0, b[1] ?? 0);
    const dot = (a[0] ?? 0) * (b[0] ?? 0) + (a[1] ?? 0) * (b[1] ?? 0);
    return length > 1e-9 && nextLength > 1e-9 && Math.abs(dot) <= 0.02 * length * nextLength
      && Math.hypot((a[0] ?? 0) + (opposite[0] ?? 0), (a[1] ?? 0) + (opposite[1] ?? 0)) <= 0.02 * length;
  });
}
