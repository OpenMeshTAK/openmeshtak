import circle from "@turf/circle";
import { XMLBuilder } from "fast-xml-parser";
import type { PackageGeometry, PackageObjectStyle, Position } from "./package-object.dto.js";
import type { PackageSnapshot, PackageSnapshotObject } from "./package-snapshot.js";

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
  format: true,
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
  }
}

function styleOf(kind: PackageSnapshotObject["kind"], style: PackageObjectStyle): Record<string, unknown> {
  const filled = kind === "polygon" || kind === "circle";
  return {
    ...(kind === "point" ? { IconStyle: { color: kmlColor(style.color) } } : {}),
    LineStyle: { color: kmlColor(style.color), width: style.strokeWidth },
    ...(filled ? { PolyStyle: { color: kmlColor(style.color, style.fillOpacity) } } : {}),
  };
}

function placemark(object: PackageSnapshotObject): Record<string, unknown> {
  return {
    "@_id": object.id,
    name: object.name,
    ...(object.description === null ? {} : { description: object.description }),
    Style: styleOf(object.kind, object.style),
    ...geometryOf(object.geometry),
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
