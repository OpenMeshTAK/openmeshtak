import { directGeodesic } from "../geodesic.js";
import type { PackageGeometry, PackageObjectStyle } from "../package-object.dto.js";
import { BEARING_UNITS } from "./native-planning.js";
import { parseArgb, parseCotNumber, withAltitude } from "./cot-values.js";

type Node = Record<string, unknown>;
const node = (value: unknown): Node => typeof value === "object" && value !== null && !Array.isArray(value) ? value as Node : {};
const value = (detail: Node, name: string) => node(detail[name]).value;
const number = (detail: Node, name: string) => parseCotNumber(value(detail, name));
const position = (point: Node) => {
  const lat = parseCotNumber(point.lat), lon = parseCotNumber(point.lon);
  return lat === null || lon === null ? null : withAltitude(lon, lat, parseCotNumber(point.hae));
};

export function rangeBearingFromCot(point: Node, detail: Node, changes: string[]): { geometry: PackageGeometry; style: Partial<PackageObjectStyle> } | string {
  const start = position(point), range = number(detail, "range"), heading = number(detail, "bearing");
  const rangeUnits = detail.rangeUnits === undefined ? 1 : number(detail, "rangeUnits"), bearingUnits = detail.bearingUnits === undefined ? 0 : number(detail, "bearingUnits"), north = detail.northRef === undefined ? 0 : number(detail, "northRef");
  if (start === null || range === null || range <= 0 || range > 20_004_000 || heading === null || Math.abs(heading) > 360
    || rangeUnits === null || bearingUnits === null || north === null || ![0, 1, 2].includes(rangeUnits) || !Number.isInteger(bearingUnits) || bearingUnits < 0 || bearingUnits >= BEARING_UNITS.length || ![0, 1, 2].includes(north)) return "R&B needs a readable anchor, positive surface range, true bearing and supported units/reference.";
  const end = directGeodesic(start, range, heading);
  const rawInclination = value(detail, "inclination"), inclination = number(detail, "inclination");
  if (rawInclination !== undefined && rawInclination !== "NaN" && (inclination === null || Math.abs(inclination) >= 90)) return "R&B inclination must be between -90 and 90 degrees, or NaN for unknown.";
  if (inclination !== null && start[2] !== undefined) end.push(start[2] + range * Math.tan(inclination * Math.PI / 180));
  if (north !== 0) changes.push("R&B bearing values are true north in ATAK CoT; magnetic/grid display preference normalized to true (no declination model)");
  if (value(detail, "anchorUID") !== undefined || value(detail, "rangeUID") !== undefined) changes.push("R&B endpoint UID bindings replaced by editable coordinates; no dangling marker references are exported");
  return { geometry: { type: "LineString", coordinates: [start, end] }, style: {
    rangeBearing: true, arrowHeads: "end", distanceUnit: rangeUnits === 2 ? "nm" : rangeUnits === 0 ? "ft" : "m", bearingUnit: BEARING_UNITS[bearingUnits]!,
    ...(parseArgb(node(detail.color).argb ?? node(detail.color).value) === null ? {} : { color: parseArgb(node(detail.color).argb ?? node(detail.color).value)!.color }),
  } };
}

export function sensorStyle(detail: Node): Partial<PackageObjectStyle> | string {
  const sensor = node(detail.sensor);
  const heading = parseCotNumber(sensor.azimuth), sweep = parseCotNumber(sensor.fov), slant = parseCotNumber(sensor.range);
  const elevation = parseCotNumber(sensor.elevation) ?? 0;
  if (heading === null || sweep === null || slant === null || slant <= 0 || Math.abs(elevation) >= 90) return "Sensor FOV requires finite azimuth, field of view and positive range.";
  const channel = (key: string, fallback: number) => parseCotNumber(sensor[key]) ?? fallback;
  const red = channel("fovRed", 1), green = channel("fovGreen", 1), blue = channel("fovBlue", 1), alpha = channel("fovAlpha", 0.3);
  if ([red, green, blue, alpha].some((value) => value < 0 || value > 1)) return "Sensor FOV colour channels and alpha must be 0–1.";
  const color = `#${[red, green, blue].map((value) => Math.round(value * 255).toString(16).padStart(2, "0")).join("")}`.toUpperCase();
  const stroke = parseArgb(sensor.strokeColor)?.color ?? color;
  const weight = parseCotNumber(sensor.strokeWeight) ?? 3;
  return { color: stroke, fillColor: color === stroke ? null : color, fillOpacity: alpha, strokeWidth: Math.min(20, Math.max(1, Math.round(weight))), sector: {
    heading, sweep, radius: slant * Math.cos(elevation * Math.PI / 180),
    rangeLines: parseCotNumber(sensor.rangeLines), displayLabels: sensor.fovLabels !== undefined, visible: sensor.hideFov === undefined,
  } };
}

export function bullseyeFromCot(point: Node, detail: Node): { geometry: PackageGeometry; style: Partial<PackageObjectStyle> } | string {
  const center = position(point), bullseye = node(detail.bullseye), radius = parseCotNumber(bullseye.distance);
  const hasRings = bullseye.hasRangeRings !== "false";
  const ringDistance = hasRings ? parseCotNumber(bullseye.ringDist) ?? radius : radius, ringCount = hasRings ? parseCotNumber(bullseye.ringNum) ?? 1 : 1;
  if (center === null || radius === null || ringDistance === null) return "Bullseye requires a readable centre, radius and ring distance.";
  return { geometry: { type: "Circle", coordinates: center, radius }, style: { bullseye: {
    ringDistance, ringCount, ringsVisible: hasRings && bullseye.rangeRingVisible === "true", edgeToCenter: bullseye.edgeToCenter === "true",
  }, distanceUnit: bullseye.distanceUnits === "NM" ? "nm" : bullseye.distanceUnits === "ft" ? "ft" : "m" } };
}

export function rangeCircleStyle(detail: Node): Partial<PackageObjectStyle> | string {
  const ellipse = node(detail.shape).ellipse;
  const rings = (Array.isArray(ellipse) ? ellipse : [ellipse]).map(node);
  const radii = rings.map((ring) => parseCotNumber(ring.major));
  if (rings.length > 10 || radii[0] == null || radii[0] <= 0 || rings.some((ring, index) => {
    const radius = radii[index];
    return radius === null || radius === undefined || parseCotNumber(ring.angle) !== 360 || parseCotNumber(ring.minor) !== radius || Math.abs(radius - radii[0]! * (index + 1)) > 0.01;
  })) return "Range circles need 1–10 evenly spaced circular rings in metres.";
  return { rangeCircle: true, rangeRings: rings.length };
}
