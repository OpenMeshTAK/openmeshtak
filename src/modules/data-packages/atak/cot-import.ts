import { XMLParser } from "fast-xml-parser";
import { geometryProblems } from "../geometry.js";
import type { ImportCandidate } from "../import-candidate.js";
import type { PackageGeometry, PackageObjectStyle } from "../package-object.dto.js";
import { parseArgb, parseCotNumber, parseLinkPoint, withAltitude, type CotColor } from "./cot-values.js";

type XmlNode = Record<string, unknown>;

export type CotConversion =
  | { outcome: "accepted"; candidate: ImportCandidate; changes: string[] }
  | { outcome: "skipped" | "rejected"; message: string };

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "",
  parseTagValue: false,
  parseAttributeValue: false,
  // Only the five predefined XML entities; documents with a DOCTYPE are rejected before parsing.
  processEntities: true,
  isArray: (name) => name === "link",
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

/** ATAK uses one colour for outline and fill in most shapes; a differing fill is reported. */
function shapeStyle(detail: XmlNode, fallback: PackageObjectStyle, changes: string[]): PackageObjectStyle {
  const stroke = parseArgb(node(detail.strokeColor).value);
  const fill: CotColor | null = parseArgb(node(detail.fillColor).value);
  const weight = parseCotNumber(node(detail.strokeWeight).value);

  const strokeWidth = weight === null ? fallback.strokeWidth : Math.min(20, Math.max(1, Math.round(weight)));
  if (weight !== null && strokeWidth !== weight) {
    changes.push(`stroke width ${String(weight)} became ${String(strokeWidth)}`);
  }
  if (stroke !== null && fill !== null && fill.alpha > 0 && fill.color !== stroke.color) {
    changes.push(`fill colour ${fill.color} replaced by the outline colour ${stroke.color}`);
  }
  return {
    color: stroke?.color ?? fallback.color,
    strokeWidth,
    fillOpacity: fill?.alpha ?? fallback.fillOpacity,
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
  changes.push("rectangle imported as an area");
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

function geometryFor(type: string, point: XmlNode, detail: XmlNode, changes: string[]): PackageGeometry | string | null {
  if (type === MARKER_TYPE || type.startsWith("b-m-p-") || type.startsWith("a-")) {
    if (type !== MARKER_TYPE) {
      changes.push(`marker type ${type} imported as a plain marker`);
    }
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
    default:
      return null;
  }
}

/**
 * Converts one untrusted CoT event into a data package object. Unsupported types are skipped and
 * invalid content is rejected, each with a reason for the import report.
 */
export function convertCotEvent(xml: string, fallback: PackageObjectStyle): CotConversion {
  if (/<!DOCTYPE|<!ENTITY/i.test(xml)) {
    return { outcome: "rejected", message: "Documents with a DOCTYPE are not accepted." };
  }
  let event: XmlNode;
  try {
    event = node(node(parser.parse(xml)).event);
  } catch {
    return { outcome: "rejected", message: "The file is not well-formed XML." };
  }
  const type = typeof event.type === "string" ? event.type : "";
  if (type === "") {
    return { outcome: "rejected", message: "The file contains no CoT event." };
  }

  const detail = node(event.detail);
  const changes: string[] = [];
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

  const style = geometry.type === "Point" ? markerStyle(detail, fallback) : shapeStyle(detail, fallback, changes);
  return {
    outcome: "accepted",
    candidate: {
      name: text(node(detail.contact).callsign, 100) ?? `Imported ${type}`,
      description: text(detail.remarks, 2000),
      geometry,
      style,
    },
    changes,
  };
}
