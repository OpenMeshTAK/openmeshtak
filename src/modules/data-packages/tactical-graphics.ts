import type { PackageGeometry, TacticalGraphicStyle } from "./package-object.dto.js";

/** Symbol facts verified against official mil-sym-ts 2.10.8 MSLookup (2525D change 1).
 * Keep this small catalog explicit; broader SIDCs require their own point/modifier validation.
 */
export const TACTICAL_GRAPHICS = [
  { entity: "110100", name: "Boundary", geometry: "LineString", min: 2, max: 1000, modifiers: ["B", "T", "T1", "AS"] },
  { entity: "140300", name: "Phase line", geometry: "LineString", min: 2, max: 1000, modifiers: ["T"] },
  { entity: "150200", name: "Assembly area", geometry: "Polygon", min: 3, max: 1000, modifiers: ["T"] },
  { entity: "151401", name: "Axis of advance: airborne/aviation", geometry: "LineString", min: 3, max: 50, modifiers: ["T", "W", "W1"] },
  { entity: "151404", name: "Axis of advance: supporting attack", geometry: "LineString", min: 3, max: 50, modifiers: ["T", "W", "W1"] },
] as const;

export function tacticalGraphicProblem(graphic: TacticalGraphicStyle, geometry: PackageGeometry): string | null {
  if (typeof graphic !== "object" || Array.isArray(graphic) || typeof graphic.sidc !== "string" || !/^11[0-9]{18}$/.test(graphic.sidc)
    || graphic.sidc.slice(4, 6) !== "25" || Object.keys(graphic).some((key) => !["sidc", "modifiers"].includes(key))) return "Choose a supported 2525D control measure SIDC.";
  const definition = TACTICAL_GRAPHICS.find(({ entity }) => entity === graphic.sidc.slice(10, 16));
  if (definition === undefined || geometry.type !== definition.geometry) return "The selected tactical graphic needs its catalogued line or polygon geometry.";
  const points = geometry.type === "Polygon" ? geometry.coordinates[0]?.length === undefined ? 0 : geometry.coordinates[0].length - 1 : geometry.type === "LineString" ? geometry.coordinates.length : 0;
  if (points < definition.min || points > definition.max || geometry.type === "Polygon" && geometry.coordinates.length !== 1) return `Use ${definition.min}–${definition.max} control points, without polygon holes.`;
  if (typeof graphic.modifiers !== "object" || graphic.modifiers === null || Array.isArray(graphic.modifiers)
    || Object.entries(graphic.modifiers).some(([key, value]) => !(definition.modifiers as readonly string[]).includes(key) || typeof value !== "string" || value.length > 100
      || Array.from(value).some((char) => char.charCodeAt(0) < 32 && ![9, 10, 13].includes(char.charCodeAt(0))))) return "Only catalogued modifiers with up to 100 characters are supported.";
  return null;
}
