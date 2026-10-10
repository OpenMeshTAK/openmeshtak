import { XMLBuilder } from "fast-xml-parser";
import { fillColorOf, strokeStyleOf } from "../object-style.js";
import type { PackageSnapshotObject } from "../package-snapshot.js";
import { SPOT_MARKER_TYPE } from "../tak-marker.js";
import { COT_UNKNOWN, toArgb } from "./cot-values.js";
import { routeCotDetails } from "./route-cot.js";
import { planningFootprint } from "../planning-footprint.js";
import { nativePlanning } from "./native-planning.js";
import { presentationLosses } from "../export-presentation.js";
import { arrowFootprints } from "../arrow-footprints.js";

/** Published objects stay on ATAK maps for a year unless a newer package replaces them. */
const STALE_AFTER_MS = 365 * 24 * 60 * 60 * 1000;

const builder = new XMLBuilder({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  textNodeName: "#text",
  format: false,
  suppressEmptyNode: true,
  suppressBooleanAttributes: false,
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
    strokeStyle: { "@_value": object.style.strokeStyle === "custom" ? "solid" : strokeStyleOf(object.style) },
    ...(object.style.height == null ? {} : { height: { "@_value": String(object.style.height) } }),
    ...(object.style.heightUnit == null ? {} : { height_unit: { "@_value": String(object.style.heightUnit) } }),
    ...(object.kind !== "circle" || object.style.extrudeMode == null ? {} : { extrudeMode: { "@_value": object.style.extrudeMode } }),
    ...(filled ? { fillColor: { "@_value": String(toArgb(fillColorOf(object.style), object.style.fillOpacity)) } } : {}),
    ...(object.style.minimumSafeDistance == null ? {} : { msd: { "@_range": object.style.minimumSafeDistance, "@_color": toArgb(object.style.msdColor ?? object.style.color, 1) } }),
  };
}

/** ATAK creates standalone waypoints as spot markers; `b-m-p-w`/`b-m-p-c` only exist inside routes. */
function pointCotType(object: PackageSnapshotObject): string {
  const type = object.tak?.cotType ?? SPOT_MARKER_TYPE;
  return type === "b-m-p-w" || type === "b-m-p-c" ? SPOT_MARKER_TYPE : type;
}

/** TAK's `b-x-KmlStyle` colours are ARGB hex (ATAK range circles, WinTAK circles), not KML's aabbggrr. */
export function argbHex(color: string, opacity = 1): string {
  return (toArgb(color, opacity) >>> 0).toString(16).padStart(8, "0");
}

function kmlStyleLink(object: PackageSnapshotObject) {
  return { "@_type": "b-x-KmlStyle", "@_uid": `${object.id}.Style`, "@_relation": "p-c", Style: {
    LineStyle: { color: argbHex(object.style.color), width: object.style.strokeWidth },
    PolyStyle: { color: argbHex(fillColorOf(object.style), object.style.fillOpacity) },
  } };
}

/** Type, point and type-specific details of one object, following real ATAK packages. */
function eventBody(object: PackageSnapshotObject): { type: string; how: string; point: ReturnType<typeof pointElement>; details: Record<string, unknown> } {
  // Native planning serializers precede geometric alternatives. Source evidence is sufficient
  // for implementation; device acceptance is tracked separately and is never implied here.
  const native = nativePlanning(object);
  // ATAK writes bullseyes like markers (`h-g-i-g-o`) and R&B/sensor objects as drawings (`h-e`).
  if (native !== null) return { type: native.type, how: native.type === "u-r-b-bullseye" ? "h-g-i-g-o" : "h-e", point: pointElement(native.position), details: native.details };
  const footprint = object.geometry.type === "Route" || object.geometry.type === "LineString" ? null : planningFootprint(object.geometry, object.style);
  if (footprint !== null) return eventBody({ ...object, kind: "polygon", geometry: footprint,
    style: { ...object.style, sector: null, corridorWidth: null } });
  const { geometry } = object;
  switch (geometry.type) {
    case "Route": {
      // ATAK's own route exports also carry the stroke details and `<color value>`.
      const argb = String(toArgb(object.style.color, 1));
      return { type: "b-m-r", how: "h-e", point: pointElement([0, 0]), details: {
        ...routeCotDetails(geometry, toArgb(object.style.color, 1), object.style.strokeWidth),
        strokeColor: { "@_value": argb },
        strokeWeight: { "@_value": String(object.style.strokeWidth) },
        strokeStyle: { "@_value": object.style.strokeStyle === "custom" ? "solid" : strokeStyleOf(object.style) },
        color: { "@_value": argb },
      } };
    }
    case "Point": {
      const argb = String(toArgb(object.style.color, 1));
      const type = pointCotType(object);
      // ATAK tints marker icons with `<color argb>`. Its own 2525 exports therefore write white
      // (no tint) plus the derived symbol path; a coloured 2525 symbol loses its affiliation colour.
      // Spot markers and icon-set images keep their chosen colour.
      const milsym = object.tak?.iconsetPath == null && type.startsWith("a-");
      const iconsetPath =
        object.tak?.iconsetPath ?? (type === SPOT_MARKER_TYPE ? `COT_MAPPING_SPOTMAP/${SPOT_MARKER_TYPE}/${argb}`
          : milsym ? `COT_MAPPING_2525C/${type.split("-").slice(0, 2).join("-")}/${type}` : null);
      return {
        type,
        how: "h-g-i-g-o",
        point: pointElement(geometry.coordinates),
        details: {
          color: { "@_argb": milsym ? "-1" : argb },
          ...(iconsetPath === null ? {} : { usericon: { "@_iconsetpath": iconsetPath } }),
        },
      };
    }
    case "LineString":
      return {
        type: "u-d-f",
        how: "h-e",
        point: pointElement(centreOf(geometry.coordinates)),
        details: { ...shapeDetails(object, false), link: geometry.coordinates.map(linkPoint),
          ...(object.style.corridorWidth == null ? {} : { msd: { "@_range": object.style.corridorWidth / 2, "@_color": toArgb(object.style.msdColor ?? object.style.color, 1) } }) },
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
    case "Rectangle":
      return {
        type: "u-d-r", how: "h-e", point: pointElement(centreOf(geometry.coordinates)),
        details: { ...shapeDetails(object, true), link: geometry.coordinates.map(linkPoint) },
      };
    case "Ellipse":
      return {
        type: "u-d-c-e", how: "h-e", point: pointElement(geometry.coordinates),
        details: {
          ...shapeDetails(object, true),
          shape: {
            ellipse: { "@_major": String(geometry.major), "@_minor": String(geometry.minor), "@_angle": String(geometry.rotation) },
            link: kmlStyleLink(object),
          },
          color: { "@_argb": toArgb(object.style.color, 1) },
        },
      };
    case "Circle":
      return {
        type: object.style.rangeCircle === true ? "u-r-b-c-c" : "u-d-c-c",
        how: "h-e",
        point: pointElement(geometry.coordinates),
        details: {
          ...shapeDetails(object, true),
          shape: {
            ellipse: Array.from({ length: object.style.rangeCircle === true ? object.style.rangeRings ?? 1 : 1 }, (_, index) => ({ "@_major": String(geometry.radius * (index + 1)), "@_minor": String(geometry.radius * (index + 1)), "@_angle": "360" })),
            link: kmlStyleLink(object),
          },
          color: { "@_argb": toArgb(object.style.color, 1) },
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
export function objectToCot(object: PackageSnapshotObject, publishedAt: Date, supplementParent = object.supplementParent): string {
  const body = eventBody(object);
  const time = publishedAt.toISOString();
  const losses = presentationLosses(object, "cot");
  const preserveSource = supplementParent !== undefined || losses.length > 0 || object.style.minimumSafeDistance != null || object.style.sector != null || object.style.corridorWidth != null || object.style.rangeBearing === true || object.style.rangeCircle === true || object.style.bullseye != null || object.style.tacticalGraphic != null;
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
        ...(object.style.tacticalGraphic == null ? {} : { __milsym: { "@_id": object.style.tacticalGraphic.sidc, unitmodifier: Object.entries(object.style.tacticalGraphic.modifiers).map(([code, value]) => ({ "@_code": code, "#text": value })) } }),
        ...(object.description === null ? {} : { remarks: { "#text": object.description } }),
        ...(object.style.labelVisible === false && (body.type === "u-d-p" || object.geometry.type === "Point" || object.style.bullseye != null) ? { hideLabel: "" } : {}),
        ...(object.geometry.type === "Point" || body.type === "u-r-b-bullseye" ? {} : { labels_on: { "@_value": String(object.style.labelVisible ?? true) } }),
        ...(preserveSource ? { openmeshtak: { "@_schema": 1, "@_source": JSON.stringify({ name: object.name, geometry: object.geometry, style: object.style, tak: object.tak }),
          ...(supplementParent === undefined ? {} : { "@_role": "supplement", "@_parent": supplementParent }),
          ...(losses.length === 0 ? {} : { "@_losses": JSON.stringify(losses) }) } } : {}),
        // <archive/> keeps the object after restarts instead of treating it as transient.
        archive: "",
      },
    },
  });
}

/** Associated visuals never replace a route or duplicate navigation semantics. */
export function objectCotPresentations(object: PackageSnapshotObject): PackageSnapshotObject[] {
  const objects = [object];
  if ((object.geometry.type === "Route" || nativePlanning(object)?.type === "u-rb-a") && object.style.corridorWidth != null) {
    const footprint = planningFootprint(object.geometry, object.style);
    if (footprint !== null) {
      const visual: PackageSnapshotObject = { ...object, id: `${object.id}.corridor`, name: `${object.name} corridor`, kind: "polygon", geometry: footprint,
        style: { ...object.style, corridorWidth: null, rangeBearing: false, routeDirectionArrows: false, arrowHeads: "none" } };
      objects.push({ ...visual, supplementParent: object.id });
    }
  }
  for (const head of arrowFootprints(object)) {
    const visual: PackageSnapshotObject = { ...object, id: `${object.id}.${head.suffix}`, name: `${object.name} arrowhead`, kind: "polygon", geometry: head.geometry,
      style: { ...object.style, arrowHeads: "none", rangeBearing: false, corridorWidth: null, minimumSafeDistance: null, labelVisible: false, fillColor: object.style.color, fillOpacity: 1, strokeStyle: "solid", dashPattern: null } };
    objects.push({ ...visual, supplementParent: object.id });
  }
  return objects;
}

export function objectToCotEvents(object: PackageSnapshotObject, publishedAt: Date): Array<{ uid: string; xml: string }> {
  return objectCotPresentations(object).map((visual) => ({ uid: visual.id, xml: objectToCot(visual, publishedAt) }));
}
