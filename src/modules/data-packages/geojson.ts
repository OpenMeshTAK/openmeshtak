import { geometryProblems } from "./geometry.js";
import { fillColorOf, strokeStyleOf } from "./object-style.js";
import { parseTakMarker } from "./tak-marker.js";
import { shapeFootprint } from "./shape-footprint.js";
import type { ImportCandidate, ImportConversion } from "./import-candidate.js";
import type { HeightUnit, PackageGeometry, PackageObjectStyle } from "./package-object.dto.js";
import type { PackageSnapshot } from "./package-snapshot.js";

type JsonObject = Record<string, unknown>;

const SUPPORTED = new Set(["Point", "LineString", "Polygon"]);
const MULTI_PARTS: Record<string, PackageGeometry["type"]> = {
  MultiPoint: "Point",
  MultiLineString: "LineString",
  MultiPolygon: "Polygon",
};

function isObject(value: unknown): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function text(value: unknown, maxLength: number): string | null {
  return typeof value === "string" && value.trim() !== "" ? value.trim().slice(0, maxLength) : null;
}

/** Features are numbered from 1 in report messages, matching how people count. */
function label(index: number, name: string | null): string {
  return name === null ? `Feature ${String(index + 1)}` : `Feature ${String(index + 1)} (${name})`;
}

const HEX_COLOR = /^#[0-9A-Fa-f]{6}$/;

/**
 * Reads the common simplestyle-spec properties (`stroke`, `marker-color`, `stroke-width`,
 * `fill`, `fill-opacity`) and our own `stroke-style`. Out-of-range values are clamped and
 * reported as changes.
 */
function styleFrom(properties: JsonObject, fallback: PackageObjectStyle, changes: string[]): PackageObjectStyle {
  const colorValue = properties.stroke ?? properties["marker-color"] ?? properties.fill;
  const color =
    typeof colorValue === "string" && HEX_COLOR.test(colorValue) ? colorValue.toUpperCase() : fallback.color;
  const fill = typeof properties.fill === "string" && HEX_COLOR.test(properties.fill) ? properties.fill.toUpperCase() : null;
  const strokeStyle = properties["stroke-style"] === "dashed" ? "dashed" : "solid";

  let strokeWidth = fallback.strokeWidth;
  if (typeof properties["stroke-width"] === "number") {
    strokeWidth = Math.min(20, Math.max(1, Math.round(properties["stroke-width"])));
    if (strokeWidth !== properties["stroke-width"]) {
      changes.push(`stroke width ${String(properties["stroke-width"])} became ${String(strokeWidth)}`);
    }
  }
  let fillOpacity = fallback.fillOpacity;
  if (typeof properties["fill-opacity"] === "number") {
    fillOpacity = Math.min(1, Math.max(0, properties["fill-opacity"]));
    if (fillOpacity !== properties["fill-opacity"]) {
      changes.push(`fill opacity ${String(properties["fill-opacity"])} became ${String(fillOpacity)}`);
    }
  }
  const height = properties["height-metres"];
  const unit = properties["height-unit"];
  const mode = properties["extrude-mode"];
  const extrusion: Partial<PackageObjectStyle> = {};
  if (height != null) {
    if (typeof height === "number" && Number.isFinite(height) && Math.abs(height) <= 100_000) extrusion.height = height;
    else changes.push("unreadable or out-of-range shape height omitted");
  }
  if (unit != null) {
    if (typeof unit === "number" && Number.isInteger(unit) && unit >= 0 && unit <= 5) extrusion.heightUnit = unit as HeightUnit;
    else changes.push("unsupported height display unit omitted");
  }
  if (mode != null) {
    if (mode === "cylinder" || mode === "cone_down") extrusion.extrudeMode = mode;
    else changes.push("unsupported extrusion mode omitted");
  }
  return { color, strokeWidth, fillOpacity, strokeStyle, fillColor: fill === null || fill === color ? null : fill, ...extrusion };
}

const IMPORTED_NAMES: Record<PackageGeometry["type"], string> = {
  Point: "point",
  LineString: "line",
  Polygon: "area",
  Circle: "circle",
  Rectangle: "rectangle",
  Ellipse: "ellipse",
  Route: "route",
};

/**
 * GeoJSON has no circles. OpenMeshTak exports them as points with `shape: "circle"` and a
 * `radius` in metres, and reads that convention back so a round trip keeps the circle.
 */
function domainGeometry(part: JsonObject, properties: JsonObject): PackageGeometry | null {
  if (part.type === "LineString" && properties.shape === "route") {
    return { type: "Route", coordinates: part.coordinates as number[][], points: properties["route-points"] as Extract<PackageGeometry, { type: "Route" }>["points"], options: properties["route-options"] as Extract<PackageGeometry, { type: "Route" }>["options"], navigationCues: properties["navigation-cues"] as Extract<PackageGeometry, { type: "Route" }>["navigationCues"] };
  }
  if (part.type === "Point" && properties.shape === "ellipse") {
    return { type: "Ellipse", coordinates: part.coordinates as number[], major: properties.major as number, minor: properties.minor as number, rotation: properties.rotation as number };
  }
  if (part.type === "Polygon" && properties.shape === "rectangle") {
    const rings = part.coordinates;
    if (Array.isArray(rings) && rings.length === 1 && Array.isArray(rings[0]) && rings[0].length === 5
      && Array.isArray(rings[0][0]) && Array.isArray(rings[0][4]) && rings[0][0][0] === rings[0][4][0] && rings[0][0][1] === rings[0][4][1]) {
      return { type: "Rectangle", coordinates: (rings[0] as number[][]).slice(0, -1) };
    }
    return { type: "Rectangle", coordinates: [] };
  }
  if (part.type !== "Point" || properties.shape !== "circle" || typeof properties.radius !== "number") {
    return null;
  }
  return { type: "Circle", coordinates: part.coordinates as number[], radius: properties.radius };
}

/** Accepts a FeatureCollection, a single Feature or a bare geometry. */
function featuresOf(document: unknown): JsonObject[] | null {
  if (!isObject(document)) {
    return null;
  }
  if (document.type === "FeatureCollection") {
    return Array.isArray(document.features) ? document.features.filter(isObject) : null;
  }
  if (document.type === "Feature") {
    return [document];
  }
  return typeof document.type === "string" ? [{ type: "Feature", geometry: document, properties: {} }] : null;
}

/** Splits multi-geometries into single parts so every part becomes its own object. */
function partsOf(geometry: JsonObject): JsonObject[] | null {
  const type = String(geometry.type);
  if (SUPPORTED.has(type)) {
    return [geometry];
  }
  const partType = MULTI_PARTS[type];
  if (partType !== undefined && Array.isArray(geometry.coordinates)) {
    return geometry.coordinates.map((coordinates: unknown) => ({ type: partType, coordinates }));
  }
  return null;
}

/**
 * Converts untrusted GeoJSON into validated objects plus a report. Nothing is silently dropped:
 * every feature ends up accepted, changed, skipped or rejected with a reason for the import report.
 */
export function convertGeoJson(document: unknown, fallbackStyle: PackageObjectStyle): ImportConversion {
  const report: ImportConversion["report"] = { changed: [], retained: [], skipped: [], rejected: [] };
  const candidates: ImportCandidate[] = [];
  const features = featuresOf(document);
  if (features === null) {
    report.rejected.push({ feature: "Document", message: "Expected a GeoJSON FeatureCollection, Feature or geometry." });
    return { candidates, report };
  }

  features.forEach((feature, index) => {
    const properties = isObject(feature.properties) ? feature.properties : {};
    const name = text(properties.name ?? properties.title, 100);
    const where = label(index, name);
    if (!isObject(feature.geometry)) {
      report.skipped.push({ feature: where, message: "The feature has no geometry." });
      return;
    }
    const parts = partsOf(feature.geometry);
    if (parts === null) {
      report.skipped.push({ feature: where, message: `${String(feature.geometry.type)} is not supported yet.` });
      return;
    }

    const changes: string[] = [];
    if (parts.length > 1) {
      changes.push(`split into ${String(parts.length)} objects`);
    }
    const style = styleFrom(properties, fallbackStyle, changes);
    const description = text(properties.description, 2000);

    parts.forEach((part, partIndex) => {
      const geometry = domainGeometry(part, properties) ?? (part as unknown as PackageGeometry);
      const problem = Array.isArray(part.coordinates) ? geometryProblems(geometry)[0] : undefined;
      if (!Array.isArray(part.coordinates) || problem !== undefined) {
        report.rejected.push({ feature: where, message: problem?.message ?? "The geometry has no coordinates." });
        return;
      }
      const baseName = name ?? `Imported ${IMPORTED_NAMES[geometry.type]} ${String(index + 1)}`;
      candidates.push({
        name: parts.length > 1 ? `${baseName} ${String(partIndex + 1)}`.slice(0, 100) : baseName,
        description,
        geometry,
        style,
        tak: geometry.type === "Point" ? parseTakMarker(properties["cot-type"], properties["iconset-path"]) : null,
      });
    });
    if (changes.length > 0) {
      report.changed.push({ feature: where, message: changes.join("; ") });
    }
  });
  return { candidates, report };
}

/** Exports a snapshot as a FeatureCollection with simplestyle-spec properties. */
export function snapshotToGeoJson(snapshot: PackageSnapshot): JsonObject {
  const layerNames = new Map(snapshot.layers.map(({ id, name }) => [id, name]));
  return {
    type: "FeatureCollection",
    features: snapshot.objects.map((object) => ({
      type: "Feature",
      id: object.id,
      geometry:
        object.geometry.type === "Circle" || object.geometry.type === "Ellipse" ? { type: "Point", coordinates: object.geometry.coordinates }
          : object.geometry.type === "Rectangle" ? shapeFootprint(object.geometry)
          : object.geometry.type === "Route" ? { type: "LineString", coordinates: object.geometry.coordinates } : object.geometry,
      properties: {
        name: object.name,
        ...(object.geometry.type === "Circle" ? { shape: "circle", radius: object.geometry.radius } : {}),
        ...(object.geometry.type === "Rectangle" ? { shape: "rectangle" } : {}),
        ...(object.geometry.type === "Ellipse" ? { shape: "ellipse", major: object.geometry.major, minor: object.geometry.minor, rotation: object.geometry.rotation } : {}),
        ...(object.geometry.type === "Route" ? { shape: "route", "route-points": object.geometry.points, "route-options": object.geometry.options, "navigation-cues": object.geometry.navigationCues } : {}),
        ...(object.tak === null ? {} : { "cot-type": object.tak.cotType, "iconset-path": object.tak.iconsetPath }),
        description: object.description,
        layer: layerNames.get(object.layerId) ?? null,
        ...(object.kind === "point" ? { "marker-color": object.style.color } : { stroke: object.style.color }),
        "stroke-width": object.style.strokeWidth,
        ...(object.style.height == null ? {} : { "height-metres": object.style.height }),
        ...(object.style.heightUnit == null ? {} : { "height-unit": object.style.heightUnit }),
        ...(object.style.extrudeMode == null ? {} : { "extrude-mode": object.style.extrudeMode }),
        ...(object.kind === "point" ? {} : { "stroke-style": strokeStyleOf(object.style) }),
        ...(["polygon", "circle", "rectangle", "ellipse"].includes(object.kind) ? { fill: fillColorOf(object.style), "fill-opacity": object.style.fillOpacity } : {}),
      },
    })),
  };
}

