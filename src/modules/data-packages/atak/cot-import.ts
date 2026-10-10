import { XMLParser } from "fast-xml-parser";
import { geometryProblems } from "../geometry.js";
import type { ImportCandidate } from "../import-candidate.js";
import type { HeightUnit, PackageGeometry, PackageObjectStyle, StrokeStyle, TakMarker } from "../package-object.dto.js";
import { parseTakMarker } from "../tak-marker.js";
import { rectangularCorners } from "../shape-footprint.js";
import { routeFromCot } from "./route-cot.js";
import { parseArgb, parseCotNumber, parseLinkPoint, withAltitude, type CotColor } from "./cot-values.js";
import { bullseyeFromCot, rangeBearingFromCot, rangeCircleStyle, sensorStyle } from "./native-planning-import.js";
import { directionStyleProblems } from "../object-style.js";
import { planningValidationGeometry } from "../planning-footprint.js";

type XmlNode = Record<string, unknown>;

/** Accepted events usually hold one object; a freehand drawing holds one per stroke. */
export type CotConversion =
  | { outcome: "accepted"; candidates: ImportCandidate[]; changes: string[] }
  | { outcome: "skipped" | "rejected"; message: string };

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "",
  parseTagValue: false,
  parseAttributeValue: false,
  // Only the five predefined XML entities; documents with a DOCTYPE are rejected before parsing.
  processEntities: true,
  trimValues: false,
  isArray: (name) => name === "link" || name === "__navcue" || name === "trigger",
});

const MARKER_TYPE = "b-m-p-s-m";

function node(value: unknown): XmlNode {
  return typeof value === "object" && value !== null && !Array.isArray(value) ? (value as XmlNode) : {};
}

function text(value: unknown, maxLength: number): string | null {
  const raw = typeof value === "string" ? value : node(value)["#text"];
  return typeof raw === "string" && raw.trim() !== "" ? raw.trim().slice(0, maxLength) : null;
}

/** The event point, usually the marker position or a shape's reference point. */
function eventPosition(point: XmlNode): number[] | null {
  const latitude = parseCotNumber(point.lat);
  const longitude = parseCotNumber(point.lon);
  return latitude === null || longitude === null ? null : withAltitude(longitude, latitude, parseCotNumber(point.hae));
}

function linkPositions(detail: XmlNode): number[][] | null {
  const links = (Array.isArray(detail.link) ? detail.link : []).map(node).filter((link) => link.point !== undefined);
  const positions = links.map((link) => parseLinkPoint(link.point));
  return positions.every((position) => position !== null) ? (positions) : null;
}

function samePlace(a: number[] | undefined, b: number[] | undefined): boolean {
  return a !== undefined && b !== undefined && a[0] === b[0] && a[1] === b[1];
}

/** Native values confirmed in ATAK-CIV StrokeFillDetailHandler, independently of device tests. */
const STROKE_STYLES = new Set(["solid", "dashed", "dotted", "outlined"]);

/** Attribute and legacy element-text forms are both present in WinTAK exports. */
function detailValue(value: unknown): unknown {
  return node(value).value ?? node(value)["#text"] ?? value;
}

function heightStyle(detail: XmlNode, changes: string[]): Partial<PackageObjectStyle> {
  const style: Partial<PackageObjectStyle> = {};
  if (detail.height !== undefined) {
    const rawHeight = detailValue(detail.height);
    const height = typeof rawHeight === "string" && rawHeight.trim() === "" ? null : parseCotNumber(rawHeight);
    if (height !== null && Math.abs(height) <= 100_000) style.height = height;
    else changes.push("unreadable or out-of-range shape height omitted");
  }
  if (detail.height_unit !== undefined) {
    const rawUnit = detailValue(detail.height_unit);
    const unit = typeof rawUnit === "string" && rawUnit.trim() === "" ? null : parseCotNumber(rawUnit);
    if (unit !== null && Number.isInteger(unit) && unit >= 0 && unit <= 5) style.heightUnit = unit as HeightUnit;
    else changes.push("unsupported height display unit omitted");
  }
  if (detail.extrudeMode !== undefined) {
    const mode = detailValue(detail.extrudeMode);
    if (mode === "cylinder" || mode === "cone_down") style.extrudeMode = mode;
    else changes.push("unsupported extrusion mode omitted");
  }
  return style;
}

/** Outline and fill keep their own colours; a fill in the outline colour fills with `color`. */
function shapeStyle(detail: XmlNode, fallback: PackageObjectStyle, changes: string[]): PackageObjectStyle {
  const stroke = parseArgb(node(detail.strokeColor).value);
  const fill: CotColor | null = parseArgb(node(detail.fillColor).value);
  const weight = parseCotNumber(node(detail.strokeWeight).value);
  const lineStyle = text(node(detail.strokeStyle).value, 32);

  const strokeWidth = weight === null ? fallback.strokeWidth : Math.min(20, Math.max(1, Math.round(weight)));
  if (weight !== null && strokeWidth !== weight) {
    changes.push(`stroke width ${String(weight)} became ${String(strokeWidth)}`);
  }
  if (lineStyle !== null && !STROKE_STYLES.has(lineStyle)) {
    changes.push(`line style ${lineStyle} became solid`);
  }
  const color = stroke?.color ?? fallback.color;
  return {
    color,
    strokeWidth,
    fillOpacity: fill?.alpha ?? fallback.fillOpacity,
    strokeStyle: lineStyle !== null && STROKE_STYLES.has(lineStyle) ? lineStyle as StrokeStyle : "solid",
    fillColor: fill === null || fill.color === color ? null : fill.color,
    ...heightStyle(detail, changes),
  };
}

function markerStyle(detail: XmlNode, fallback: PackageObjectStyle): PackageObjectStyle {
  const color = node(detail.color);
  return { ...fallback, color: parseArgb(color.argb ?? color.value)?.color ?? fallback.color };
}

/** Freeform shapes are polygons when the last link point repeats the first, otherwise lines. */
function freeformGeometry(detail: XmlNode): PackageGeometry | string {
  const positions = linkPositions(detail);
  if (positions === null) {
    return "A shape vertex has an unreadable position.";
  }
  if (positions.length > 2 && samePlace(positions[0], positions.at(-1))) {
    return { type: "Polygon", coordinates: [positions] };
  }
  return { type: "LineString", coordinates: positions };
}

/** ATAK rectangles carry their four corners as link points; they become closed areas. */
function rectangleGeometry(detail: XmlNode, changes: string[]): PackageGeometry | string {
  const corners = linkPositions(detail);
  if (corners?.length !== 4) {
    return "A rectangle needs four corner positions.";
  }
  if (rectangularCorners(corners)) return { type: "Rectangle", coordinates: corners };
  changes.push("non-rectangular corners imported as an area");
  return { type: "Polygon", coordinates: [[...corners, corners[0] ?? []]] };
}

function circleGeometry(point: XmlNode, detail: XmlNode, changes: string[]): PackageGeometry | string {
  const center = eventPosition(point);
  const ellipses = node(detail.shape).ellipse;
  const ellipse = node(Array.isArray(ellipses) ? ellipses[0] : ellipses);
  const major = parseCotNumber(ellipse.major);
  const minor = parseCotNumber(ellipse.minor);
  if (center === null || major === null) {
    return "The circle has no readable centre or radius.";
  }
  if (minor !== null && Math.abs(major - minor) > 0.01) {
    changes.push(`ellipse ${String(major)} m × ${String(minor)} m imported as a circle with the larger radius`);
  }
  return { type: "Circle", coordinates: center, radius: Math.round(major * 100) / 100 };
}

function ellipseGeometry(point: XmlNode, detail: XmlNode): PackageGeometry | string {
  const center = eventPosition(point);
  const shape = node(detail.shape);
  if (Array.isArray(shape.ellipse)) return "Multiple concentric ellipses are not supported yet.";
  const value = node(shape.ellipse);
  const major = parseCotNumber(value.major);
  const minor = parseCotNumber(value.minor);
  const rotation = parseCotNumber(value.angle);
  if (center === null || major === null || minor === null || rotation === null) return "The ellipse has unreadable axes, centre or rotation.";
  return { type: "Ellipse", coordinates: center, major, minor, rotation: ((rotation % 360) + 360) % 360 };
}

/**
 * Ellipses may carry their colours only in a `b-x-KmlStyle` (WinTAK). Its colours are ARGB hex,
 * not KML's aabbggrr: ATAK range circles and WinTAK circles write the same value there as in
 * `strokeColor`. Explicit stroke/fill details win when both are present.
 */
function ellipseStyle(detail: XmlNode, fallback: PackageObjectStyle, changes: string[]): PackageObjectStyle {
  const links = node(detail.shape).link;
  const style = node(node((Array.isArray(links) ? links : []).map(node).find((link) => link.type === "b-x-KmlStyle")).Style);
  const line = node(style.LineStyle);
  const fill = node(style.PolyStyle);
  const argb = (value: unknown): number | null => {
    if (typeof value !== "string" || !/^[0-9a-f]{8}$/i.test(value.trim())) return null;
    return Number.parseInt(value.trim(), 16) | 0;
  };
  return shapeStyle({
    ...detail,
    strokeColor: detail.strokeColor ?? { value: argb(line.color) },
    fillColor: detail.fillColor ?? { value: argb(fill.color) },
    strokeWeight: detail.strokeWeight ?? { value: line.width },
  }, fallback, changes);
}

/** Spot markers, waypoints and MIL-STD-2525 units (`a-*`) are markers. */
function isMarkerType(type: string): boolean {
  return type === "u-d-p" || type === MARKER_TYPE || type.startsWith("b-m-p-") || type.startsWith("a-");
}

/**
 * Keeps the CoT type and icon set of a marker so the export reproduces it. Plain spot markers need
 * nothing: their spot-map icon path is derived from the colour again on export.
 */
function takMarker(type: string, detail: XmlNode): TakMarker | null {
  const iconsetPath = text(node(detail.usericon).iconsetpath, 256);
  // Spot colour icons and ATAK's 2525 symbol paths are derived from type/colour and regenerated on export.
  const derivedSpotIcon = iconsetPath === null || iconsetPath.startsWith("COT_MAPPING_SPOTMAP/") || iconsetPath.startsWith("COT_MAPPING_2525");
  if (type === MARKER_TYPE && derivedSpotIcon) {
    return null;
  }
  return parseTakMarker(type, derivedSpotIcon ? null : iconsetPath);
}

function geometryFor(type: string, point: XmlNode, detail: XmlNode, changes: string[]): PackageGeometry | string | null {
  if (isMarkerType(type)) {
    const position = eventPosition(point);
    return position === null ? "The marker has no readable position." : { type: "Point", coordinates: position };
  }
  switch (type) {
    case "u-d-f":
      return freeformGeometry(detail);
    case "u-d-r":
      return rectangleGeometry(detail, changes);
    case "u-d-c-c":
    case "u-r-b-c-c":
      return circleGeometry(point, detail, changes);
    case "u-d-c-e":
      return ellipseGeometry(point, detail);
    case "b-m-r":
      return routeFromCot(detail, changes);
    default:
      return null;
  }
}

/** Parses one untrusted CoT event, refusing documents with a DOCTYPE. */
function parseEvent(xml: string): { event: XmlNode; type: string } | string {
  if (/<!DOCTYPE|<!ENTITY/i.test(xml)) {
    return "Documents with a DOCTYPE are not accepted.";
  }
  let event: XmlNode;
  try {
    event = node(node(parser.parse(xml)).event);
  } catch {
    return "The file is not well-formed XML.";
  }
  const type = typeof event.type === "string" ? event.type : "";
  return type === "" ? "The file contains no CoT event." : { event, type };
}

/** Each stroke is a whole CoT event; this bounds the work one drawing can cause. */
const MAX_FREEHAND_STROKES = 100;

/**
 * Freehand drawings (`u-d-f-m`) embed each stroke as a complete `u-d-f` event in
 * `<link line="…">`. Every stroke becomes its own line or area named after the drawing; the
 * strokes keep their own colour, and the drawing's remarks go to each of them.
 */
function freehandCandidates(detail: XmlNode, fallback: PackageObjectStyle, changes: string[]): ImportCandidate[] | string {
  const strokes = (Array.isArray(detail.link) ? detail.link : [])
    .map(node)
    .flatMap((link) => (typeof link.line === "string" ? [link.line] : []));
  if (strokes.length === 0) {
    return "The freehand drawing has no strokes.";
  }
  if (strokes.length > MAX_FREEHAND_STROKES) {
    return `A freehand drawing can have at most ${String(MAX_FREEHAND_STROKES)} strokes.`;
  }
  const name = text(node(detail.contact).callsign, 100) ?? "Freehand drawing";
  const candidates: ImportCandidate[] = [];
  for (const [index, stroke] of strokes.entries()) {
    const inner = parseEvent(stroke);
    if (typeof inner === "string" || inner.type !== "u-d-f") {
      return "A stroke of the freehand drawing is not a readable shape.";
    }
    const strokeDetail = node(inner.event.detail);
    const geometry = freeformGeometry(strokeDetail);
    if (typeof geometry === "string") {
      return geometry;
    }
    const problem = geometryProblems(geometry)[0];
    if (problem !== undefined) {
      return problem.message;
    }
    candidates.push({
      name: strokes.length > 1 ? `${name} ${String(index + 1)}`.slice(0, 100) : name,
      description: text(detail.remarks, 2000),
      geometry,
      style: { ...shapeStyle(strokeDetail, fallback, changes), ...heightStyle(detail, changes) },
      tak: null,
    });
  }
  if (strokes.length > 1) {
    changes.push(`freehand drawing split into ${String(strokes.length)} objects`);
  }
  return candidates;
}

/**
 * Converts one untrusted CoT event into data package objects. Unsupported types are skipped and
 * invalid content is rejected, each with a reason for the import report.
 */
export function convertCotEvent(xml: string, fallback: PackageObjectStyle): CotConversion {
  const parsed = parseEvent(xml);
  if (typeof parsed === "string") {
    return { outcome: "rejected", message: parsed };
  }
  const { event, type } = parsed;
  const detail = node(event.detail);
  const changes: string[] = [];
  const extension = node(detail.openmeshtak);
  if (extension.schema === "1" && extension.role === "supplement") return { outcome: "skipped", message: "Associated corridor visual omitted from editing; its source object retains the editable corridor parameters." };
  if (type === "u-d-f-m") {
    const candidates = freehandCandidates(detail, fallback, changes);
    return typeof candidates === "string" ? { outcome: "rejected", message: candidates } : { outcome: "accepted", candidates, changes };
  }
  const native = type === "u-rb-a" ? rangeBearingFromCot(node(event.point), detail, changes) : type === "u-r-b-bullseye" ? bullseyeFromCot(node(event.point), detail) : null;
  if (typeof native === "string") return { outcome: "rejected", message: native };
  let geometry = native?.geometry ?? geometryFor(type, node(event.point), detail, changes);
  if (geometry === null) {
    return { outcome: "skipped", message: `CoT type ${type} is not supported yet.` };
  }
  if (typeof geometry === "string") {
    return { outcome: "rejected", message: geometry };
  }
  const problem = geometryProblems(geometry)[0];
  if (problem !== undefined) {
    return { outcome: "rejected", message: problem.message };
  }

  const routeAttributes = node(detail.link_attr);
  // A 2525 symbol's colour is its affiliation; ATAK's `<color argb>` there is only an icon tint (white).
  const iconsetPath = text(node(detail.usericon).iconsetpath, 256);
  const milsym = geometry.type === "Point" && type.startsWith("a-") && (iconsetPath === null || iconsetPath.startsWith("COT_MAPPING_2525"));
  let style = milsym ? { ...fallback } : geometry.type === "Point" || type === "u-r-b-bullseye" ? markerStyle(detail, fallback) : geometry.type === "Ellipse" || type === "u-r-b-c-c" ? ellipseStyle(detail, fallback, changes)
    : shapeStyle(geometry.type === "Route" ? { ...detail, strokeColor: { value: routeAttributes.color }, strokeWeight: { value: routeAttributes.stroke } } : detail, fallback, changes);
  Object.assign(style, native?.style ?? {});
  if (detail.__milsym !== undefined) {
    const graphic = node(detail.__milsym);
    const children = Array.isArray(graphic.unitmodifier) ? graphic.unitmodifier : graphic.unitmodifier === undefined ? [] : [graphic.unitmodifier];
    const modifiers: Record<string, string> = {};
    for (const entry of children) {
      const modifier = node(entry);
      if (typeof modifier.code !== "string" || modifier.code in modifiers || (modifier["#text"] !== undefined && typeof modifier["#text"] !== "string")) return { outcome: "rejected", message: "Unreadable or repeated tactical modifier." };
      modifiers[modifier.code] = modifier["#text"] ?? "";
    }
    if (typeof graphic.id !== "string") return { outcome: "rejected", message: "A tactical graphic requires a SIDC." };
    style.tacticalGraphic = { sidc: graphic.id, modifiers };
  }
  const callsign = typeof node(detail.contact).callsign === "string" ? node(detail.contact).callsign as string : `Imported ${type}`;
  let name = callsign.trim().slice(0, 100) || `Imported ${type}`;
  let tak = geometry.type === "Point" ? takMarker(type, detail) : null;
  // A plain `u-d-p` named point has no text-only rendering in ATAK; keep it as an ordinary spot marker.
  if (type === "u-d-p" && detail.sensor === undefined) {
    tak = null;
    changes.push("u-d-p point imported as a spot marker");
  }
  if (detail.sensor !== undefined && geometry.type === "Point") {
    const sensor = sensorStyle(detail);
    if (typeof sensor === "string") return { outcome: "rejected", message: sensor };
    Object.assign(style, sensor);
  }
  if (type === "u-r-b-c-c") {
    const rings = rangeCircleStyle(detail);
    if (typeof rings === "string") return { outcome: "rejected", message: rings };
    Object.assign(style, rings);
  }
  if (detail.msd !== undefined && geometry.type !== "Point" && geometry.type !== "Route") {
    const range = parseCotNumber(node(detail.msd).range);
    if (range === null || range < 0.1 || range > 5000) return { outcome: "rejected", message: "An MSD boundary needs 0.1–5000 metres from the source shape." };
    style.minimumSafeDistance = range;
    style.msdColor = parseArgb(node(detail.msd).color)?.color ?? "#FF0000";
    if (geometry.type === "LineString" && range >= 0.5) {
      style.minimumSafeDistance = null;
      style.corridorWidth = range * 2;
      style.fillOpacity = 0;
      changes.push("Native MSD distance imported as full corridor width (twice the centreline distance)");
    }
  }
  style.labelVisible = geometry.type === "Point" || type === "u-r-b-bullseye" ? detail.hideLabel === undefined
    : detail.labels_on === undefined || node(detail.labels_on).value === undefined || node(detail.labels_on).value === "true";
  // Our extension preserves editable source geometry and nonportable styling. It is untrusted
  // input and passes the same geometry/style limits before becoming a draft object.
  if (extension.schema === "1" && extension.source !== undefined) {
    if (typeof extension.source !== "string" || Buffer.byteLength(extension.source, "utf8") > 1024 * 1024) return { outcome: "rejected", message: "OpenMeshTak source metadata is too large or unreadable." };
    try {
      const source = node(JSON.parse(extension.source));
      if (typeof source.name !== "string" || source.name.trim() === "" || source.name.length > 100 || source.geometry === null || source.style === null
        || typeof source.geometry !== "object" || typeof source.style !== "object" || Array.isArray(source.geometry) || Array.isArray(source.style)) throw new Error();
      geometry = source.geometry as PackageGeometry;
      style = source.style as PackageObjectStyle;
      name = source.name;
      tak = source.tak == null ? null : parseTakMarker(node(source.tak).cotType, node(source.tak).iconsetPath);
      if (source.tak != null && tak === null) throw new Error();
    } catch { return { outcome: "rejected", message: "Invalid OpenMeshTak source metadata." }; }
  }
  const sourceGeometryProblem = geometryProblems(geometry)[0];
  if (sourceGeometryProblem !== undefined) return { outcome: "rejected", message: sourceGeometryProblem.message };
  const presentationProblem = directionStyleProblems(style, geometry)[0];
  if (presentationProblem !== undefined) return { outcome: "rejected", message: presentationProblem.message };
  try {
    const footprintProblem = planningValidationGeometry(geometry, style).flatMap(geometryProblems)[0];
    if (footprintProblem !== undefined) return { outcome: "rejected", message: footprintProblem.message };
  } catch { return { outcome: "rejected", message: "The planning footprint cannot be generated." }; }
  return {
    outcome: "accepted",
    candidates: [
      {
        name,
        description: typeof detail.remarks === "string" ? detail.remarks.slice(0, 2000) : typeof node(detail.remarks)["#text"] === "string" ? (node(detail.remarks)["#text"] as string).slice(0, 2000) : null,
        geometry,
        style,
        tak: geometry.type === "Point" ? tak : null,
      },
    ],
    changes,
  };
}
