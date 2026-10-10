import circle from "@turf/circle";
import { XMLBuilder } from "fast-xml-parser";
import type { PackageGeometry, PackageObjectStyle, Position } from "./package-object.dto.js";
import { fillColorOf } from "./object-style.js";
import { presentationLosses } from "./export-presentation.js";
import { shapeFootprint } from "./shape-footprint.js";
import type { PackageSnapshot, PackageSnapshotObject } from "./package-snapshot.js";
import { planningFootprint } from "./planning-footprint.js";
import { arrowFootprints } from "./arrow-footprints.js";

/**
 * A small, tested KML subset for GIS tools such as Google Earth: one folder per layer, points,
 * lines and polygons with their colours, and circles as 64-sided polygons because KML has no
 * circle geometry. ATAK-specific details (CoT types, icons) are not part of KML; use the ATAK
 * Data Package export for TAK apps.
 */
const CIRCLE_STEPS = 64;

const builder = new XMLBuilder({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  format: false,
  suppressBooleanAttributes: false,
  suppressEmptyNode: true,
});

/** KML colours are `aabbggrr` hex, the reverse of CSS `#rrggbb`. */
export function kmlColor(hex: string, opacity = 1): string {
  const alpha = Math.round(Math.min(1, Math.max(0, opacity)) * 255)
    .toString(16)
    .padStart(2, "0");
  const [red, green, blue] = [hex.slice(1, 3), hex.slice(3, 5), hex.slice(5, 7)];
  return `${alpha}${blue}${green}${red}`.toLowerCase();
}

/** KML writes `lon,lat[,alt]`; unknown altitude stays absent instead of becoming zero. */
function coordinates(positions: Position[]): string {
  return positions.map((position) => position.join(",")).join(" ");
}

function ring(positions: Position[]) {
  return { LinearRing: { coordinates: coordinates(positions) } };
}

function geometryOf(geometry: PackageGeometry): Record<string, unknown> {
  switch (geometry.type) {
    case "Point":
      return { Point: { coordinates: coordinates([geometry.coordinates]) } };
    case "LineString":
    case "Route":
      return { LineString: { tessellate: 1, coordinates: coordinates(geometry.coordinates) } };
    case "Polygon": {
      const [outer, ...holes] = geometry.coordinates;
      return {
        Polygon: {
          outerBoundaryIs: ring(outer ?? []),
          ...(holes.length > 0 ? { innerBoundaryIs: holes.map(ring) } : {}),
        },
      };
    }
    case "Circle": {
      const [lon = 0, lat = 0] = geometry.coordinates;
      const polygon = circle([lon, lat], geometry.radius, { steps: CIRCLE_STEPS, units: "meters" });
      return { Polygon: { outerBoundaryIs: ring(polygon.geometry.coordinates[0] as Position[]) } };
    }
    case "Rectangle":
    case "Ellipse":
      return geometryOf(shapeFootprint(geometry));
  }
}

function styleOf(kind: PackageSnapshotObject["kind"], style: PackageObjectStyle): Record<string, unknown> {
  const filled = ["polygon", "circle", "rectangle", "ellipse"].includes(kind);
  return {
    ...(kind === "point" ? { IconStyle: { color: kmlColor(style.color) } } : {}),
    LineStyle: { color: kmlColor(style.color), width: style.strokeWidth },
    ...(style.labelVisible === false ? { LabelStyle: { scale: 0 } } : {}),
    ...(filled ? { PolyStyle: { color: kmlColor(fillColorOf(style), style.fillOpacity) } } : {}),
  };
}

/** Keep source paths together with supplementary planning footprints. */
function presentationGeometry(object: PackageSnapshotObject): Record<string, unknown> {
  const footprint = planningFootprint(object.geometry, object.style);
  const heads = arrowFootprints(object, false);
  if (heads.length > 0) return { MultiGeometry: { ...geometryOf(object.geometry), Polygon: [...(footprint === null ? [] : [geometryOf(footprint).Polygon]), ...heads.map(({ geometry }) => geometryOf(geometry).Polygon)] } };
  if (object.style.corridorWidth != null && footprint !== null) return { MultiGeometry: { ...geometryOf(object.geometry), ...geometryOf(footprint) } };
  if (object.geometry.type === "Circle" && (object.style.rangeCircle === true || object.style.bullseye?.ringsVisible === true)) {
    const geometry = object.geometry;
    const count = object.style.rangeCircle === true ? object.style.rangeRings ?? 1 : object.style.bullseye!.ringCount;
    const spacing = object.style.rangeCircle === true ? geometry.radius : object.style.bullseye!.ringDistance;
    const circles = Array.from({ length: count }, (_, index) => geometryOf({ ...geometry, radius: spacing * (index + 1) }).Polygon);
    if (object.style.bullseye != null) circles.unshift(geometryOf(geometry).Polygon);
    return { MultiGeometry: { Polygon: circles } };
  }
  return geometryOf(footprint ?? object.geometry);
}

function placemark(object: PackageSnapshotObject): Record<string, unknown> {
  const extra: Array<{ "@_name": string; value: string }> = [];
  extra.push({ "@_name": "openmeshtak:source", value: JSON.stringify({ name: object.name, geometry: object.geometry, style: object.style, tak: object.tak }) });
  if (object.style.strokeStyle === "dotted" || object.style.strokeStyle === "custom") extra.push({ "@_name": "openmeshtak:line-pattern", value: JSON.stringify({ strokeStyle: object.style.strokeStyle, dashPattern: object.style.dashPattern }) });
  if (object.style.sector != null || object.style.corridorWidth != null || object.style.rangeBearing === true) {
    extra.push({ "@_name": "openmeshtak:planning-style", value: JSON.stringify(object.style) });
    extra.push({ "@_name": "openmeshtak:source-geometry", value: JSON.stringify(object.geometry) });
  }
  const losses = presentationLosses(object, "kml");
  const fallback = losses.length === 0 ? null : losses.map(({ message }) => message).join("\n");
  if (fallback !== null) {
    extra.push({ "@_name": "openmeshtak:conversion-losses", value: JSON.stringify(losses) });
    extra.push({ "@_name": "openmeshtak:presentation-fallback", value: fallback });
    extra.push({ "@_name": "openmeshtak:direction-style", value: JSON.stringify({ arrowHeads: object.style.arrowHeads, arrowHeadSize: object.style.arrowHeadSize, routeDirectionArrows: object.style.routeDirectionArrows, routeArrowSpacing: object.style.routeArrowSpacing }) });
  }
  if (["Circle", "Ellipse"].includes(object.geometry.type)) extra.push({ "@_name": "openmeshtak:approximation", value: "64-sided footprint; use CoT or GeoJSON to retain parametric geometry" });
  if (["Rectangle", "Ellipse", "Route"].includes(object.geometry.type)) extra.push({ "@_name": "openmeshtak:geometry", value: JSON.stringify(object.geometry) });
  if (object.style.height != null) extra.push({ "@_name": "openmeshtak:height-metres", value: String(object.style.height) });
  if (object.style.heightUnit != null) extra.push({ "@_name": "openmeshtak:height-unit", value: String(object.style.heightUnit) });
  if (object.style.extrudeMode != null) extra.push({ "@_name": "openmeshtak:extrude-mode", value: object.style.extrudeMode });
  return {
    "@_id": object.id,
    name: object.name,
    ...(object.style.sector?.visible === false ? { visibility: 0 } : {}),
    ...(object.description === null ? {} : { description: object.description }),
    Style: styleOf(object.style.sector != null || object.style.corridorWidth != null ? "polygon" : object.kind, object.style),
    ...(extra.length === 0 ? {} : { ExtendedData: { Data: extra } }),
    ...presentationGeometry(object),
  };
}

/** Converts a package snapshot (draft or published revision) into a KML document. */
export function snapshotToKml(snapshot: PackageSnapshot): string {
  const layers = [...snapshot.layers].sort((a, b) => b.sortOrder - a.sortOrder);
  const document = {
    "?xml": { "@_version": "1.0", "@_encoding": "UTF-8" },
    kml: {
      "@_xmlns": "http://www.opengis.net/kml/2.2",
      Document: {
        name: snapshot.name,
        Folder: layers.map((layer) => ({
          name: layer.name,
          visibility: layer.visible ? 1 : 0,
          Placemark: snapshot.objects.filter(({ layerId }) => layerId === layer.id).map(placemark),
        })),
      },
    },
  };
  return builder.build(document);
}
