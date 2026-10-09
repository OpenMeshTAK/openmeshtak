import { randomUUID } from "node:crypto";
import type { PackageGeometry, RouteGeometry } from "./package-object.dto.js";

export function routeProblem(route: RouteGeometry): string | null {
  if (!Array.isArray(route.points) || route.points.length !== route.coordinates.length || route.points.length < 2) return "Every route position needs matching waypoint or checkpoint metadata; a route needs at least two points.";
  const ids = new Set<string>();
  for (const point of route.points) {
    if (point == null || typeof point.id !== "string" || point.id.length === 0 || point.id.length > 128 || /[\u0000-\u001f]/.test(point.id)
      || ids.has(point.id) || !["waypoint", "checkpoint"].includes(point.type)
      || typeof point.name !== "string" || point.name.length > 100 || typeof point.remarks !== "string" || point.remarks.length > 2000) return "Route points need unique IDs, supported types and bounded names/remarks.";
    ids.add(point.id);
  }
  if (typeof route.options !== "object" || route.options === null || Array.isArray(route.options)
    || Object.keys(route.options).some((key) => !["transportationType", "method", "direction", "routeType", "order", "planningMethod", "prefix"].includes(key))
    || Object.values(route.options).some((value) => typeof value !== "string" || value.length > 64 || /[\u0000-\u001f]/.test(value))) return "Route options must be short text values.";
  if (!Array.isArray(route.navigationCues) || route.navigationCues.length > 1000) return "A route can have at most 1000 navigation cues.";
  const cueIds = new Set<string>();
  for (const cue of route.navigationCues) {
    if (cue == null || !ids.has(cue.pointId) || cueIds.has(cue.pointId) || typeof cue.text !== "string" || cue.text.length > 2000
      || typeof cue.voice !== "string" || cue.voice.length > 2000 || !Array.isArray(cue.triggers) || cue.triggers.length > 16
      || cue.triggers.some((trigger) => trigger == null || !["d", "t"].includes(trigger.mode) || !Number.isInteger(trigger.value) || trigger.value < 0 || trigger.value > 2147483647)) return "Navigation cues need an existing route point, bounded text and supported triggers.";
    cueIds.add(cue.pointId);
  }
  return null;
}

/** A copied route must not refer to the original route's points in TAK apps. */
export function copyGeometry(geometry: PackageGeometry): PackageGeometry {
  if (geometry.type !== "Route") return geometry;
  const ids = new Map(geometry.points.map((point) => [point.id, randomUUID()]));
  return { ...geometry, points: geometry.points.map((point) => ({ ...point, id: ids.get(point.id) ?? point.id })), navigationCues: geometry.navigationCues.map((cue) => ({ ...cue, pointId: ids.get(cue.pointId) ?? cue.pointId })) };
}
