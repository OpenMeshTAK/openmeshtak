import { nativePlanning, sensorCompatible } from "./atak/native-planning.js";
import type { PackageSnapshotObject } from "./package-snapshot.js";

export interface PresentationLoss { objectId: string; objectName: string; code: string; message: string }
export interface PresentationReport { format: "cot" | "kml"; losses: PresentationLoss[] }

/**
 * What a TAK app or GIS tool will show differently from the editor, in plain words for operators.
 * The editor keeps every detail; CoT and GeoJSON exports carry it for re-import.
 */
export function presentationLosses(object: PackageSnapshotObject, format: "cot" | "kml"): PresentationLoss[] {
  const { style, geometry } = object;
  const losses: PresentationLoss[] = [];
  const add = (code: string, message: string) => losses.push({ objectId: object.id, objectName: object.name, code, message });
  const native = format === "cot" ? nativePlanning(object)?.type : undefined;
  if (format === "kml" && style.tacticalGraphic != null) add("TACTICAL_GEOMETRY", "KML shows only the control points of the tactical graphic, not the military symbol.");
  if (format === "kml" && style.strokeStyle != null && style.strokeStyle !== "solid") add("LINE_PATTERN", "KML shows the line solid.");
  if (format === "cot" && style.strokeStyle === "custom") add("CUSTOM_DASHES", "ATAK shows the custom dash pattern as a solid line.");
  if (style.minimumSafeDistance != null) add("MSD_PRESENTATION", format === "cot" ? "ATAK draws the safety distance in its own style." : "KML shows the shape without its safety distance.");
  if (format === "cot" && style.bullseye != null) add("BULLSEYE_DISPLAY", "ATAK uses its own colour and unit settings for the bullseye.");
  if (style.sector != null && (format === "kml" || !sensorCompatible(style.sector))) add("SECTOR_POLYGON", format === "kml" ? "KML shows the sector as a plain area." : "ATAK shows this sector as a plain area: ATAK sectors need whole degrees and metres, less than 360° and at most 60 km.");
  if (format === "cot" && style.sector?.visible === false && !sensorCompatible(style.sector)) add("SECTOR_VISIBILITY", "The sector is hidden in the editor but visible in ATAK.");
  if (style.corridorWidth != null) {
    if (format === "cot" && geometry.type === "LineString" && native !== "u-rb-a") add("MSD_BOUNDARY", "ATAK shows the corridor as an unfilled safety distance around the line.");
    else add("CORRIDOR_POLYGON", geometry.type === "Route" ? "The corridor is added as a separate area next to the route." : "The corridor is added as a separate area.");
  }
  if ((style.arrowHeads ?? "none") !== "none") {
    if (native === "u-rb-a") add("ARROW_PRESENTATION", style.arrowHeads === "both" ? "ATAK shows a Range & Bearing line; the start arrowhead is a separate small triangle." : style.arrowHeads === "start" ? "ATAK shows a Range & Bearing line pointing to the start; it measures from the end point." : "ATAK shows a Range & Bearing line with distance and bearing.");
    else add("ARROWHEADS", "Arrowheads become separate small triangles with a fixed size on the ground.");
  }
  if (style.routeDirectionArrows === true) add("ROUTE_INDICATORS", "Route direction arrows are only shown in the editor.");
  if (format === "kml" && (style.rangeBearing === true || style.rangeCircle === true || style.bullseye != null)) add("PLANNING_OVERLAY", "KML shows plain lines and circles without measurements.");
  return losses;
}
