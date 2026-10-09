import kinks from "@turf/kinks";
import type { ProblemFieldError } from "../../shared/errors/problem-error.js";
import type { CircleGeometry, PackageGeometry, PackageObjectKind } from "./package-object.dto.js";
import { rectangularCorners, shapeFootprint } from "./shape-footprint.js";
import { routeProblem } from "./route-geometry.js";

/** Bounds one object so drawing, storage and export stay fast. */
export const MAX_POSITIONS_PER_OBJECT = 10_000;

const KIND_BY_TYPE: Record<PackageGeometry["type"], PackageObjectKind> = {
  Point: "point",
  LineString: "line",
  Polygon: "polygon",
  Circle: "circle",
  Rectangle: "rectangle",
  Ellipse: "ellipse",
  Route: "route",
};

/** Largest circle radius in metres; larger areas belong in a polygon. */
export const MAX_CIRCLE_RADIUS_METRES = 100_000;
const METRES_PER_DEGREE = 111_320;

export function kindOf(geometry: PackageGeometry): PackageObjectKind {
  return KIND_BY_TYPE[geometry.type];
}

function positionProblem(position: number[]): string | null {
  if (position.length !== 2 && position.length !== 3) {
    return "Positions are [longitude, latitude] or [longitude, latitude, altitude].";
  }
  if (!position.every((value) => typeof value === "number" && Number.isFinite(value))) {
    return "Coordinates must be finite numbers.";
  }
  const [longitude = 0, latitude = 0] = position;
  if (longitude < -180 || longitude > 180) {
    return "Longitude must be between -180 and 180.";
  }
  if (latitude < -90 || latitude > 90) {
    return "Latitude must be between -90 and 90.";
  }
  return null;
}

/**
 * RC1 rejects geometry crossing the antimeridian with a validation error instead of silently
 * reshaping it. A segment spanning more than 180 degrees of longitude can only be drawn across
 * the 180th meridian.
 */
function crossesAntimeridian(positions: number[][]): boolean {
  return positions.some((position, index) => {
    const next = positions[index + 1];
    return next !== undefined && Math.abs((next[0] ?? 0) - (position[0] ?? 0)) > 180;
  });
}

function samePlace(a: number[] | undefined, b: number[] | undefined): boolean {
  return a !== undefined && b !== undefined && a[0] === b[0] && a[1] === b[1];
}

function isPositionList(value: unknown): value is number[][] {
  return Array.isArray(value) && value.every((position) => Array.isArray(position));
}

/** Imported JSON may nest arrays wrongly; check the shape before reading positions. */
function hasValidNesting(geometry: PackageGeometry): boolean {
  switch (geometry.type) {
    case "Point":
    case "Circle":
    case "Ellipse":
      return Array.isArray(geometry.coordinates);
    case "LineString":
    case "Rectangle":
    case "Route":
      return isPositionList(geometry.coordinates);
    case "Polygon":
      return Array.isArray(geometry.coordinates) && geometry.coordinates.every(isPositionList);
    default:
      return false;
  }
}

function ringsOf(geometry: PackageGeometry): number[][][] {
  switch (geometry.type) {
    case "Point":
    case "Circle":
    case "Ellipse":
      return [[geometry.coordinates]];
    case "LineString":
    case "Route":
      return [geometry.coordinates];
    case "Rectangle":
      return [[...geometry.coordinates, geometry.coordinates[0] ?? []]];
    case "Polygon":
      return geometry.coordinates;
  }
}

/** Whether the circle reaches over the 180th meridian (east-west extent at its latitude). */
function circleCrossesAntimeridian(geometry: CircleGeometry): boolean {
  const [longitude = 0, latitude = 0] = geometry.coordinates;
  const metresPerDegree = METRES_PER_DEGREE * Math.cos((latitude * Math.PI) / 180);
  return metresPerDegree <= 0 || Math.abs(longitude) + geometry.radius / metresPerDegree > 180;
}

function shapeProblem(geometry: PackageGeometry): string | null {
  if (geometry.type === "Route") return routeProblem(geometry);
  if (geometry.type === "Rectangle" && !rectangularCorners(geometry.coordinates)) {
    return "A rectangle needs four corners in order with right angles and matching opposite sides.";
  }
  if (geometry.type === "Ellipse") {
    if (![geometry.major, geometry.minor].every((axis) => Number.isFinite(axis) && axis >= 0.1 && axis <= MAX_CIRCLE_RADIUS_METRES)
      || geometry.minor > geometry.major || !Number.isFinite(geometry.rotation) || geometry.rotation < 0 || geometry.rotation > 360) {
      return "An ellipse needs axes between 0.1 and 100000 metres (minor <= major) and a rotation between 0 and 360 degrees.";
    }
  }
  if (geometry.type === "Circle") {
    const radius: unknown = geometry.radius;
    if (typeof radius !== "number" || !Number.isFinite(radius) || radius < 0.1 || radius > MAX_CIRCLE_RADIUS_METRES) {
      return `A circle radius must be between 0.1 and ${String(MAX_CIRCLE_RADIUS_METRES)} metres.`;
    }
  }
  if (geometry.type === "LineString" && geometry.coordinates.length < 2) {
    return "A line needs at least two positions.";
  }
  if (geometry.type === "Polygon") {
    if (geometry.coordinates.length === 0) {
      return "A polygon needs an outer ring.";
    }
    for (const ring of geometry.coordinates) {
      if (ring.length < 4) {
        return "Polygon rings need at least four positions, the last repeating the first.";
      }
      if (!samePlace(ring[0], ring.at(-1))) {
        return "Polygon rings must be closed: the last position must repeat the first.";
      }
    }
  }
  return null;
}

/**
 * Validates RFC 7946 geometry in WGS84. Altitude is optional metres HAE; a missing altitude means
 * unknown and is never filled with zero. Problems are reported on the `geometry` field.
 */
export function geometryProblems(geometry: PackageGeometry): ProblemFieldError[] {
  const problem = (code: string, message: string): ProblemFieldError[] => [{ field: "geometry", code, message }];
  if (!hasValidNesting(geometry)) {
    return problem("INVALID_STRUCTURE", "Coordinates are not nested as RFC 7946 requires for this geometry type.");
  }
  const rings = ringsOf(geometry);

  if (rings.reduce((total, ring) => total + ring.length, 0) > MAX_POSITIONS_PER_OBJECT) {
    return problem("TOO_LARGE", `An object can have at most ${String(MAX_POSITIONS_PER_OBJECT)} positions.`);
  }
  for (const position of rings.flat()) {
    const message = positionProblem(position);
    if (message !== null) {
      return problem("INVALID_POSITION", message);
    }
  }
  const shape = shapeProblem(geometry);
  if (shape !== null) {
    return problem("INVALID_SHAPE", shape);
  }
  if (geometry.type === "Ellipse") {
    // Use the larger axis as a conservative bound, including ellipses centred near the poles.
    if (circleCrossesAntimeridian({ type: "Circle", coordinates: geometry.coordinates, radius: geometry.major })) {
      return problem("CROSSES_ANTIMERIDIAN", "Geometry crossing the 180th meridian is not supported yet.");
    }
    if (shapeFootprint(geometry).coordinates.flat().some((p) => positionProblem(p) !== null)) {
      return problem("INVALID_SHAPE", "The ellipse footprint is outside supported coordinates.");
    }
  }
  if (rings.some(crossesAntimeridian) || (geometry.type === "Circle" && circleCrossesAntimeridian(geometry))) {
    return problem("CROSSES_ANTIMERIDIAN", "Geometry crossing the 180th meridian is not supported yet.");
  }
  // Lines may cross themselves (a patrol loop); polygon rings may not.
  if (geometry.type === "Polygon" && kinks(geometry).features.length > 0) {
    return problem("SELF_INTERSECTION", "Polygon edges must not cross each other.");
  }
  return [];
}
