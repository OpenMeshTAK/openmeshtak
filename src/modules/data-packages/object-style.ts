import { tacticalGraphicProblem } from "./tactical-graphics.js";
import type { PackageGeometry, PackageObjectStyle, StrokeStyle } from "./package-object.dto.js";
import type { ProblemFieldError } from "../../shared/errors/problem-error.js";

/** The line style, also for objects saved before line styles existed. */
export function strokeStyleOf(style: PackageObjectStyle): StrokeStyle {
  return style.strokeStyle ?? "solid";
}

/** The fill colour; objects without their own fill colour fill with the outline colour. */
export function fillColorOf(style: PackageObjectStyle): string {
  return style.fillColor ?? style.color;
}

/**
 * A stored style without retired fields. Standalone text labels were removed before release
 * (2026-10-10); development data may still carry `label`, which the point keeps as an ordinary marker.
 */
export function storedStyle(value: unknown): PackageObjectStyle {
  const style = { ...(value as PackageObjectStyle & { label?: unknown }) };
  delete style.label;
  return style;
}

/** A style with every optional field set, as the API returns it. */
export function completeStyle(stored: PackageObjectStyle): Required<PackageObjectStyle> {
  const style = storedStyle(stored);
  return {
    ...style,
    strokeStyle: strokeStyleOf(style),
    fillColor: style.fillColor ?? null,
    height: style.height ?? null,
    heightUnit: style.heightUnit ?? null,
    extrudeMode: style.extrudeMode ?? null,
    arrowHeads: style.arrowHeads ?? "none",
    arrowHeadSize: style.arrowHeadSize ?? 16,
    routeDirectionArrows: style.routeDirectionArrows ?? false,
    routeArrowSpacing: style.routeArrowSpacing ?? 80,
    sector: style.sector ?? null,
    rangeBearing: style.rangeBearing ?? false,
    distanceUnit: style.distanceUnit ?? "m",
    corridorWidth: style.corridorWidth ?? null,
    dashPattern: style.dashPattern ?? null,
    labelVisible: style.labelVisible ?? true,
    rangeCircle: style.rangeCircle ?? false,
    rangeRings: style.rangeRings ?? 1,
    bullseye: style.bullseye ?? null,
    bearingUnit: style.bearingUnit ?? "degrees",
    minimumSafeDistance: style.minimumSafeDistance ?? null,
    msdColor: style.msdColor ?? null,
    tacticalGraphic: style.tacticalGraphic ?? null,
  };
}

/** Presentation may never silently turn a point or a route into another object type. */
export function directionStyleProblems(style: PackageObjectStyle, geometry: PackageGeometry): ProblemFieldError[] {
  const problems: ProblemFieldError[] = [];
  const reject = (field: string, message: string) => problems.push({ field: `style.${field}`, code: "INVALID_STYLE", message });
  const allowed = ["color", "strokeWidth", "fillOpacity", "strokeStyle", "fillColor", "height", "heightUnit", "extrudeMode", "arrowHeads", "arrowHeadSize", "routeDirectionArrows", "routeArrowSpacing", "sector", "rangeBearing", "distanceUnit", "corridorWidth", "dashPattern", "labelVisible", "rangeCircle", "rangeRings", "bullseye", "bearingUnit", "minimumSafeDistance", "msdColor", "tacticalGraphic"];
  if (Object.keys(style).some((key) => !allowed.includes(key))) reject("", "Unknown presentation property.");
  if (style.height != null && (!Number.isFinite(style.height) || Math.abs(style.height) > 100000)) reject("height", "Use a finite height within 100000 metres.");
  if (style.heightUnit != null && ![0, 1, 2, 3, 4, 5].includes(style.heightUnit)) reject("heightUnit", "Choose a supported height unit.");
  if (style.extrudeMode != null && !["cylinder", "cone_down"].includes(style.extrudeMode)) reject("extrudeMode", "Choose a supported extrusion mode.");
  if (typeof style.color !== "string" || !/^#[0-9a-f]{6}$/i.test(style.color)) reject("color", "Use a six-digit colour.");
  if (!Number.isInteger(style.strokeWidth) || style.strokeWidth < 1 || style.strokeWidth > 20) reject("strokeWidth", "Use a whole width between 1 and 20 pixels.");
  if (!Number.isFinite(style.fillOpacity) || style.fillOpacity < 0 || style.fillOpacity > 1) reject("fillOpacity", "Use opacity between 0 and 1.");
  if (style.fillColor != null && !/^#[0-9a-f]{6}$/i.test(style.fillColor)) reject("fillColor", "Use a six-digit colour or null.");
  if (style.msdColor != null && !/^#[0-9a-f]{6}$/i.test(style.msdColor)) reject("msdColor", "Use a six-digit colour or null.");
  if (style.minimumSafeDistance != null && (!Number.isFinite(style.minimumSafeDistance) || style.minimumSafeDistance < 0.1 || style.minimumSafeDistance > 5000
    || ["Point", "Route"].includes(geometry.type) || style.rangeBearing === true || style.bullseye != null || style.corridorWidth != null
    || (style.arrowHeads ?? "none") !== "none")) reject("minimumSafeDistance", "MSD needs an ordinary shape and 0.1–5000 m, without a corridor/R&B/bullseye/arrow.");
  if (style.strokeStyle !== undefined && !["solid", "dashed", "dotted", "outlined", "custom"].includes(style.strokeStyle)) reject("strokeStyle", "Choose a supported line style.");
  for (const field of ["labelVisible", "rangeCircle"] as const) if (style[field] !== undefined && typeof style[field] !== "boolean") reject(field, "Use a boolean.");
  if (style.rangeCircle === true && geometry.type !== "Circle") reject("rangeCircle", "Range rings need Circle geometry.");
  if (style.rangeRings !== undefined && (!Number.isInteger(style.rangeRings) || style.rangeRings < 1 || style.rangeRings > 10 || style.rangeRings > 1 && style.rangeCircle !== true)) reject("rangeRings", "Choose 1–10 rings for a range circle.");
  if (style.bearingUnit !== undefined && !["degrees", "mils", "radians", "warsaw-mils", "streck", "clock"].includes(style.bearingUnit)) reject("bearingUnit", "Choose a supported bearing unit.");
  if (style.bullseye != null) {
    const value = style.bullseye;
    if (typeof value !== "object" || Array.isArray(value) || geometry.type !== "Circle" || style.rangeCircle === true
      || !Number.isFinite(value.ringDistance) || value.ringDistance < 0.1 || value.ringDistance > 100000
      || !Number.isInteger(value.ringCount) || value.ringCount < 1 || value.ringCount > 10
      || typeof value.ringsVisible !== "boolean" || typeof value.edgeToCenter !== "boolean"
      || Object.keys(value).some((key) => !["ringDistance", "ringCount", "ringsVisible", "edgeToCenter"].includes(key))) reject("bullseye", "A bullseye needs a Circle, bounded ring distance/count and visibility/direction flags.");
  }
  if ((style.strokeStyle === "custom" || style.dashPattern != null) && (style.dashPattern == null || !Array.isArray(style.dashPattern) || style.dashPattern.length < 2 || style.dashPattern.length > 8
    || style.dashPattern.length % 2 !== 0 || !style.dashPattern.every((value) => Number.isInteger(value) && value >= 1 && value <= 64))) reject("dashPattern", "Custom dashes need 2–8 alternating whole dash/gap lengths between 1 and 64 pixels (an even count).");
  if (style.sector != null) {
    const sector = style.sector;
    if (geometry.type !== "Point" || typeof sector !== "object" || Array.isArray(sector)
      || Object.keys(sector).some((key) => !["heading", "sweep", "radius", "rangeLines", "displayLabels", "visible"].includes(key))
      || !Number.isFinite(sector.heading) || sector.heading < 0 || sector.heading > 360
      || !Number.isFinite(sector.sweep) || sector.sweep < 1 || sector.sweep > 360
      || !Number.isFinite(sector.radius) || sector.radius < 0.1 || sector.radius > 100000
      || sector.displayLabels !== undefined && typeof sector.displayLabels !== "boolean"
      || sector.visible !== undefined && typeof sector.visible !== "boolean"
      || sector.rangeLines != null && (!Number.isFinite(sector.rangeLines) || sector.rangeLines < 1 || sector.rangeLines > 60000)) reject("sector", "A point sector needs heading 0–360°, sweep 1–360° and radius 0.1–100000 m; range lines 1–60000 m.");
  }
  if (style.rangeBearing !== undefined && typeof style.rangeBearing !== "boolean") reject("rangeBearing", "Range & Bearing must be a boolean.");
  if (style.rangeBearing === true && (geometry.type !== "LineString" || geometry.coordinates.length !== 2
    || geometry.coordinates[0]?.[0] === geometry.coordinates[1]?.[0] && geometry.coordinates[0]?.[1] === geometry.coordinates[1]?.[1])) reject("rangeBearing", "Range & Bearing needs exactly two different positions.");
  if (style.distanceUnit !== undefined && !["m", "km", "ft", "mi", "nm"].includes(style.distanceUnit)) reject("distanceUnit", "Choose m, km, ft, mi or nm.");
  if (style.corridorWidth != null && (typeof style.corridorWidth !== "number" || !Number.isFinite(style.corridorWidth)
    || style.corridorWidth < 1 || style.corridorWidth > 10000 || !["LineString", "Route"].includes(geometry.type))) reject("corridorWidth", "A line/route corridor needs a width between 1 and 10000 metres.");
  if (style.corridorWidth != null && (geometry.type === "LineString" || geometry.type === "Route") && geometry.coordinates.length > 1000) reject("corridorWidth", "Corridors support up to 1000 source positions.");
  if (style.minimumSafeDistance != null && ((geometry.type === "LineString" && geometry.coordinates.length > 1000) || (geometry.type === "Polygon" && geometry.coordinates.reduce((sum, ring) => sum + ring.length, 0) > 1000))) reject("minimumSafeDistance", "MSD supports up to 1000 source positions.");
  if (style.arrowHeads !== undefined && !["none", "start", "end", "both"].includes(style.arrowHeads)) reject("arrowHeads", "Choose none, start, end or both.");
  if (style.arrowHeads !== undefined && style.arrowHeads !== "none" && geometry.type !== "LineString") reject("arrowHeads", "Endpoint arrowheads apply only to lines.");
  if (style.routeDirectionArrows !== undefined && typeof style.routeDirectionArrows !== "boolean") reject("routeDirectionArrows", "Choose whether to show route directions.");
  if (style.routeDirectionArrows === true && geometry.type !== "Route") reject("routeDirectionArrows", "Direction indicators apply only to routes.");
  for (const [field, value, min, max] of [["arrowHeadSize", style.arrowHeadSize, 6, 64], ["routeArrowSpacing", style.routeArrowSpacing, 24, 256]] as const) {
    if (value !== undefined && (!Number.isInteger(value) || value < min || value > max)) reject(field, `Enter a whole number between ${min} and ${max} pixels.`);
  }
  if (style.tacticalGraphic != null) {
    const problem = tacticalGraphicProblem(style.tacticalGraphic, geometry);
    if (problem !== null) reject("tacticalGraphic", problem);
    if (style.corridorWidth != null || style.rangeBearing === true || (style.arrowHeads ?? "none") !== "none") reject("tacticalGraphic", "A tactical graphic cannot also be a corridor/R&B/decorative arrow.");
  }
  return problems;
}
