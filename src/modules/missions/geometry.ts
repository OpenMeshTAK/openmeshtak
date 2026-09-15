import kinks from "@turf/kinks";
import type { ProblemFieldError } from "../../shared/errors/problem-error.js";
import type { MissionGeometry, MissionObjectKind } from "./mission-object.dto.js";

/** Bounds one object so drawing, storage and export stay fast. */
export const MAX_POSITIONS_PER_OBJECT = 10_000;

const KIND_BY_TYPE: Record<MissionGeometry["type"], MissionObjectKind> = {
  Point: "point",
  LineString: "line",
  Polygon: "polygon",
};

export function kindOf(geometry: MissionGeometry): MissionObjectKind {
  return KIND_BY_TYPE[geometry.type];
}

function positionProblem(position: number[]): string | null {
  if (position.length !== 2 && position.length !== 3) {
    return "Positions are [longitude, latitude] or [longitude, latitude, altitude].";
  }
  if (!position.every((value) => Number.isFinite(value))) {
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
 * RC1 rejects geometry crossing the antimeridian instead of reshaping it (EDITOR.md). A segment
 * spanning more than 180 degrees of longitude can only be drawn across the 180th meridian.
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

function ringsOf(geometry: MissionGeometry): number[][][] {
  switch (geometry.type) {
    case "Point":
      return [[geometry.coordinates]];
    case "LineString":
      return [geometry.coordinates];
    case "Polygon":
      return geometry.coordinates;
  }
}

function shapeProblem(geometry: MissionGeometry): string | null {
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
export function geometryProblems(geometry: MissionGeometry): ProblemFieldError[] {
  const problem = (code: string, message: string): ProblemFieldError[] => [{ field: "geometry", code, message }];
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
  if (rings.some(crossesAntimeridian)) {
    return problem("CROSSES_ANTIMERIDIAN", "Geometry crossing the 180th meridian is not supported yet.");
  }
  // Lines may cross themselves (a patrol loop); polygon rings may not.
  if (geometry.type === "Polygon" && kinks(geometry).features.length > 0) {
    return problem("SELF_INTERSECTION", "Polygon edges must not cross each other.");
  }
  return [];
}
