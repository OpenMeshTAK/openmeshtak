import GeographicLib from "geographiclib-geodesic";

/** WGS84 ellipsoid, matching the surface-distance semantics of ATAK R&B details. */
export function inverseGeodesic(start: number[], end: number[]): { metres: number; bearing: number } {
  const result = GeographicLib.Geodesic.WGS84.Inverse(start[1]!, start[0]!, end[1]!, end[0]!);
  return { metres: result.s12!, bearing: (result.azi1! + 360) % 360 };
}
export function directGeodesic(start: number[], metres: number, bearing: number): number[] {
  const result = GeographicLib.Geodesic.WGS84.Direct(start[1]!, start[0]!, bearing, metres);
  return [result.lon2!, result.lat2!];
}
