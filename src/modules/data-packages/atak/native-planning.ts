import { inverseGeodesic } from "../geodesic.js";
import { fillColorOf } from "../object-style.js";
import type { PackageSnapshotObject } from "../package-snapshot.js";
import { toArgb } from "./cot-values.js";

export const BEARING_UNITS = ["degrees", "mils", "radians", "warsaw-mils", "streck", "clock"] as const;
export function nativeRangeUnits(unit: string): number { return unit === "nm" ? 2 : unit === "ft" || unit === "mi" ? 0 : 1; }

/** Source-confirmed ATAK-CIV contracts; this does not assert real-client acceptance. */
export function nativePlanning(object: PackageSnapshotObject): { type: string; position: number[]; details: Record<string, unknown> } | null {
  const { geometry, style } = object;
  if (geometry.type === "LineString" && geometry.coordinates.length === 2
    && (style.rangeBearing === true || style.arrowHeads === "start" || style.arrowHeads === "end" || style.arrowHeads === "both")) {
    // u-rb-a always draws its head at the measured endpoint. A start head (also on a saved R&B)
    // therefore swaps the native endpoints; "both" adds one associated start head (arrow-footprints).
    const [start, end] = style.arrowHeads === "start" ? [...geometry.coordinates].reverse() : geometry.coordinates;
    const { metres, bearing } = inverseGeodesic(start!, end!);
    if (metres <= 0) return null;
    const altitudeKnown = start?.[2] !== undefined && end?.[2] !== undefined;
    return { type: "u-rb-a", position: start!, details: {
      range: { "@_value": metres }, bearing: { "@_value": bearing },
      ...(altitudeKnown ? { inclination: { "@_value": Math.atan2(end[2]! - start[2]!, metres) * 180 / Math.PI } } : {}),
      rangeUnits: { "@_value": nativeRangeUnits(style.distanceUnit ?? "m") },
      bearingUnits: { "@_value": BEARING_UNITS.indexOf(style.bearingUnit ?? "degrees") }, northRef: { "@_value": 0 },
      // Endpoints are coordinates, not exported marker entities: never emit dangling UID links.
      // ATAK's R&B exports store the line colour as strokeColor/color value; `color argb` is ignored.
      strokeColor: { "@_value": toArgb(style.color, 1) }, color: { "@_value": toArgb(style.color, 1) },
      strokeWeight: { "@_value": style.strokeWidth },
      strokeStyle: { "@_value": style.strokeStyle === "custom" ? "solid" : style.strokeStyle ?? "solid" },
    } };
  }
  if (geometry.type === "Point" && style.sector != null && sensorCompatible(style.sector)) {
    const value = style.sector;
    const color = fillColorOf(style);
    return { type: "u-d-p", position: geometry.coordinates, details: { color: { "@_argb": toArgb(style.color, 1) }, sensor: {
      "@_azimuth": value.heading % 360, "@_fov": value.sweep, "@_range": value.radius,
      "@_elevation": 0, "@_displayMagneticReference": 0,
      "@_rangeLines": value.rangeLines ?? 100,
      // ATAK imports these flags by attribute presence; a false attribute would enable them.
      ...(value.displayLabels === true ? { "@_fovLabels": "true" } : {}),
      ...(value.visible === false ? { "@_hideFov": "true" } : {}),
      "@_fovRed": Number.parseInt(color.slice(1, 3), 16) / 255,
      "@_fovGreen": Number.parseInt(color.slice(3, 5), 16) / 255,
      "@_fovBlue": Number.parseInt(color.slice(5, 7), 16) / 255, "@_fovAlpha": style.fillOpacity,
      "@_strokeColor": toArgb(style.color, 1), "@_strokeWeight": style.strokeWidth,
    } } };
  }
  if (geometry.type === "Circle" && style.bullseye != null) {
    const value = style.bullseye;
    return { type: "u-r-b-bullseye", position: geometry.coordinates, details: { color: { "@_argb": toArgb(style.color, 1) }, bullseye: {
      "@_bullseyeUID": `${object.id}.COMPAT`, "@_title": object.name,
      "@_distance": geometry.radius, "@_distanceUnits": style.distanceUnit === "nm" ? "NM" : style.distanceUnit === "ft" || style.distanceUnit === "mi" ? "ft" : "m",
      "@_edgeToCenter": String(value.edgeToCenter), "@_rangeRingVisible": String(value.ringsVisible),
      "@_hasRangeRings": "true", "@_ringDist": value.ringDistance, "@_ringNum": value.ringCount,
    } } };
  }
  return null;
}

export function sensorCompatible(sector: NonNullable<PackageSnapshotObject["style"]["sector"]>): boolean {
  return Number.isInteger(sector.heading) && Number.isInteger(sector.sweep) && Number.isInteger(sector.radius)
    && (sector.rangeLines == null || Number.isInteger(sector.rangeLines))
    && sector.sweep < 360 && sector.radius <= 60_000;
}
