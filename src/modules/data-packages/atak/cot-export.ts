import { XMLBuilder } from "fast-xml-parser";
import type { PackageSnapshotObject } from "../package-snapshot.js";
import { SPOT_MARKER_TYPE } from "../tak-marker.js";
import { COT_UNKNOWN, toArgb } from "./cot-values.js";

/** Published objects stay on ATAK maps for a year unless a newer package replaces them. */
const STALE_AFTER_MS = 365 * 24 * 60 * 60 * 1000;

const builder = new XMLBuilder({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  textNodeName: "#text",
  format: true,
  suppressEmptyNode: true,
});

type Position = number[];

function altitudeOf(position: Position): number | null {
  return position[2] ?? null;
}

/** CoT `<point>`; unknown altitude and accuracy use the CoT "unknown" value, never zero. */
function pointElement(position: Position) {
  return {
    "@_lat": String(position[1]),
    "@_lon": String(position[0]),
    "@_hae": String(altitudeOf(position) ?? COT_UNKNOWN),
    "@_ce": String(COT_UNKNOWN),
    "@_le": String(COT_UNKNOWN),
  };
}

/** Shape vertices as `lat,lon[,hae]` link points, always with dot decimals. */
function linkPoint(position: Position) {
  const altitude = altitudeOf(position);
  return { "@_point": [position[1], position[0], ...(altitude === null ? [] : [altitude])].map(String).join(",") };
}

/** ATAK places a shape's label at the event point; the vertex average is a good centre. */
function centreOf(positions: Position[]): Position {
  let longitude = 0;
  let latitude = 0;
  for (const position of positions) {
    longitude += position[0] ?? 0;
    latitude += position[1] ?? 0;
  }
  return [longitude / positions.length, latitude / positions.length];
}

function shapeDetails(object: PackageSnapshotObject, filled: boolean) {
  return {
    strokeColor: { "@_value": String(toArgb(object.style.color, 1)) },
    strokeWeight: { "@_value": String(object.style.strokeWidth) },
    strokeStyle: { "@_value": "solid" },
    ...(filled ? { fillColor: { "@_value": String(toArgb(object.style.color, object.style.fillOpacity)) } } : {}),
  };
}

/** Type, point and type-specific details of one object, following real ATAK packages. */
function eventBody(object: PackageSnapshotObject) {
  const { geometry } = object;
  switch (geometry.type) {
    case "Point": {
      const argb = String(toArgb(object.style.color, 1));
      const type = object.tak?.cotType ?? SPOT_MARKER_TYPE;
      // Spot markers get their colour icon; other types keep a stored icon set path or let ATAK
      // draw the symbol from the type (e.g. MIL-STD-2525 for `a-*`).
      const iconsetPath =
        object.tak?.iconsetPath ?? (type === SPOT_MARKER_TYPE ? `COT_MAPPING_SPOTMAP/${SPOT_MARKER_TYPE}/${argb}` : null);
      return {
        type,
        how: "h-g-i-g-o",
        point: pointElement(geometry.coordinates),
        details: {
          color: { "@_argb": argb },
          ...(iconsetPath === null ? {} : { usericon: { "@_iconsetpath": iconsetPath } }),
        },
      };
    }
    case "LineString":
      return {
        type: "u-d-f",
        how: "h-e",
        point: pointElement(centreOf(geometry.coordinates)),
        details: { ...shapeDetails(object, false), link: geometry.coordinates.map(linkPoint) },
      };
    case "Polygon": {
      // ATAK freeform shapes have no holes; only the outer ring is written.
      const ring = geometry.coordinates[0] ?? [];
      return {
        type: "u-d-f",
        how: "h-e",
        point: pointElement(centreOf(ring.slice(0, -1))),
        details: { ...shapeDetails(object, true), link: ring.map(linkPoint) },
      };
    }
    case "Circle":
      return {
        type: "u-d-c-c",
        how: "h-e",
        point: pointElement(geometry.coordinates),
        details: {
          ...shapeDetails(object, true),
          shape: {
            ellipse: { "@_major": String(geometry.radius), "@_minor": String(geometry.radius), "@_angle": "360" },
          },
        },
      };
  }
}

/** The CoT type and position an object is exported with, e.g. for mission change details. */
export function objectCotSummary(object: PackageSnapshotObject): { type: string; lat: number; lon: number } {
  const body = eventBody(object);
  return { type: body.type, lat: Number(body.point["@_lat"]), lon: Number(body.point["@_lon"]) };
}

/** Builds the CoT event XML for one published object. */
export function objectToCot(object: PackageSnapshotObject, publishedAt: Date): string {
  const body = eventBody(object);
  const time = publishedAt.toISOString();
  return builder.build({
    event: {
      "@_version": "2.0",
      "@_uid": object.id,
      "@_type": body.type,
      "@_time": time,
      "@_start": time,
      "@_stale": new Date(publishedAt.getTime() + STALE_AFTER_MS).toISOString(),
      "@_how": body.how,
      point: body.point,
      detail: {
        contact: { "@_callsign": object.name },
        ...body.details,
        ...(object.description === null ? {} : { remarks: { "#text": object.description } }),
        // <archive/> keeps the object after restarts instead of treating it as transient.
        archive: "",
      },
    },
  });
}
