import { geometryProblems } from "./geometry.js";
import type { MissionGeometry, MissionObjectStyle } from "./mission-object.dto.js";
import type { GeoJsonImportReport } from "./mission-import.dto.js";
import type { MissionSnapshot } from "./mission-snapshot.js";

/** One object the import would create, after conversion and validation. */
export interface ImportCandidate {
  name: string;
  description: string | null;
  geometry: MissionGeometry;
  style: MissionObjectStyle;
}

export interface ImportConversion {
  candidates: ImportCandidate[];
  report: Omit<GeoJsonImportReport, "accepted">;
}

type JsonObject = Record<string, unknown>;

const SUPPORTED = new Set(["Point", "LineString", "Polygon"]);
const MULTI_PARTS: Record<string, MissionGeometry["type"]> = {
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

/**
 * Reads the common simplestyle-spec properties (`stroke`, `marker-color`, `stroke-width`,
 * `fill-opacity`). Out-of-range values are clamped and reported as changes.
 */
function styleFrom(properties: JsonObject, fallback: MissionObjectStyle, changes: string[]): MissionObjectStyle {
  const colorValue = properties.stroke ?? properties["marker-color"] ?? properties.fill;
  const color =
    typeof colorValue === "string" && /^#[0-9A-Fa-f]{6}$/.test(colorValue) ? colorValue.toUpperCase() : fallback.color;

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
  return { color, strokeWidth, fillOpacity };
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
 * every feature ends up accepted, changed, skipped or rejected with a reason (EDITOR.md).
 */
export function convertGeoJson(document: unknown, fallbackStyle: MissionObjectStyle): ImportConversion {
  const report: ImportConversion["report"] = { changed: [], skipped: [], rejected: [] };
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
      const geometry = part as unknown as MissionGeometry;
      const problem = Array.isArray(part.coordinates) ? geometryProblems(geometry)[0] : undefined;
      if (!Array.isArray(part.coordinates) || problem !== undefined) {
        report.rejected.push({ feature: where, message: problem?.message ?? "The geometry has no coordinates." });
        return;
      }
      const baseName = name ?? `Imported ${geometry.type === "Point" ? "point" : geometry.type === "LineString" ? "line" : "area"} ${String(index + 1)}`;
      candidates.push({
        name: parts.length > 1 ? `${baseName} ${String(partIndex + 1)}`.slice(0, 100) : baseName,
        description,
        geometry,
        style,
      });
    });
    if (changes.length > 0) {
      report.changed.push({ feature: where, message: changes.join("; ") });
    }
  });
  return { candidates, report };
}

/** Exports a snapshot as a FeatureCollection with simplestyle-spec properties. */
export function snapshotToGeoJson(snapshot: MissionSnapshot): JsonObject {
  const layerNames = new Map(snapshot.layers.map(({ id, name }) => [id, name]));
  return {
    type: "FeatureCollection",
    features: snapshot.objects.map((object) => ({
      type: "Feature",
      id: object.id,
      geometry: object.geometry,
      properties: {
        name: object.name,
        description: object.description,
        layer: layerNames.get(object.layerId) ?? null,
        ...(object.kind === "point" ? { "marker-color": object.style.color } : { stroke: object.style.color }),
        "stroke-width": object.style.strokeWidth,
        ...(object.kind === "polygon" ? { fill: object.style.color, "fill-opacity": object.style.fillOpacity } : {}),
      },
    })),
  };
}

