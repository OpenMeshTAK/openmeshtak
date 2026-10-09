import type { PackageObjectStyle, StrokeStyle } from "./package-object.dto.js";

/** The line style, also for objects saved before line styles existed. */
export function strokeStyleOf(style: PackageObjectStyle): StrokeStyle {
  return style.strokeStyle ?? "solid";
}

/** The fill colour; objects without their own fill colour fill with the outline colour. */
export function fillColorOf(style: PackageObjectStyle): string {
  return style.fillColor ?? style.color;
}

/** A style with every optional field set, as the API returns it. */
export function completeStyle(style: PackageObjectStyle): Required<PackageObjectStyle> {
  return {
    ...style,
    strokeStyle: strokeStyleOf(style),
    fillColor: style.fillColor ?? null,
    height: style.height ?? null,
    heightUnit: style.heightUnit ?? null,
    extrudeMode: style.extrudeMode ?? null,
  };
}
