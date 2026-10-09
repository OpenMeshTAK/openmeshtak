import { XMLParser } from "fast-xml-parser";
import { geometryProblems } from "../geometry.js";
import type { ImportCandidate } from "../import-candidate.js";
import type { HeightUnit, PackageGeometry, PackageObjectStyle, TakMarker } from "../package-object.dto.js";
import { parseTakMarker } from "../tak-marker.js";
import { rectangularCorners } from "../shape-footprint.js";
import { routeFromCot } from "./route-cot.js";
import { parseArgb, parseCotNumber, parseLinkPoint, withAltitude, type CotColor } from "./cot-values.js";

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

/** `strokeStyle` values seen in real exports; ATAK's others (e.g. `dotted`) need a real export first. */
const STROKE_STYLES = new Set(["solid", "dashed"]);

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
    strokeStyle: lineStyle === "dashed" ? "dashed" : "solid",
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
  const ellipse = node(node(detail.shape).ellipse);
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

/** Ellipses carry their colours in a KML style rather than the usual ARGB details. */
function ellipseStyle(detail: XmlNode, fallback: PackageObjectStyle, changes: string[]): PackageObjectStyle {
  const links = node(detail.shape).link;
  const style = node(node((Array.isArray(links) ? links : []).map(node).find((link) => link.type === "b-x-KmlStyle")).Style);
  const line = node(style.LineStyle);
  const fill = node(style.PolyStyle);
  const argb = (value: unknown): number | null => {
    if (typeof value !== "string" || !/^[0-9a-f]{8}$/i.test(value)) return null;
    return Number.parseInt(`${value.slice(0, 2)}${value.slice(6, 8)}${value.slice(4, 6)}${value.slice(2, 4)}`, 16) | 0;
  };
  return shapeStyle({ ...detail, strokeColor: { value: argb(line.color) }, fillColor: { value: argb(fill.color) }, strokeWeight: { value: line.width } }, fallback, changes);
}

/** Spot markers, waypoints and MIL-STD-2525 units (`a-*`) are markers. */
function isMarkerType(type: string): boolean {
  return type === MARKER_TYPE || type.startsWith("b-m-p-") || type.startsWith("a-");
}

/**
 * Keeps the CoT type and icon set of a marker so the export reproduces it. Plain spot markers need
 * nothing: their spot-map icon path is derived from the colour again on export.
 */
function takMarker(type: string, detail: XmlNode): TakMarker | null {
  const iconsetPath = text(node(detail.usericon).iconsetpath, 256);
  const derivedSpotIcon = iconsetPath === null || iconsetPath.startsWith("COT_MAPPING_SPOTMAP/");
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
  if (type === "u-d-f-m") {
    const candidates = freehandCandidates(detail, fallback, changes);
    return typeof candidates === "string" ? { outcome: "rejected", message: candidates } : { outcome: "accepted", candidates, changes };
  }
  const geometry = geometryFor(type, node(event.point), detail, changes);
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
  const style = geometry.type === "Point" ? markerStyle(detail, fallback) : geometry.type === "Ellipse" ? ellipseStyle(detail, fallback, changes)
    : shapeStyle(geometry.type === "Route" ? { ...detail, strokeColor: { value: routeAttributes.color }, strokeWeight: { value: routeAttributes.stroke } } : detail, fallback, changes);
  return {
    outcome: "accepted",
    candidates: [
      {
        name: text(node(detail.contact).callsign, 100) ?? `Imported ${type}`,
        description: text(detail.remarks, 2000),
        geometry,
        style,
        tak: geometry.type === "Point" ? takMarker(type, detail) : null,
      },
    ],
    changes,
  };
}
