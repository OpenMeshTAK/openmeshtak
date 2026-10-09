import { randomUUID } from "node:crypto";
import type { RouteGeometry, RouteOptions } from "../package-object.dto.js";
import { parseCotNumber, parseLinkPoint } from "./cot-values.js";
import { routeProblem } from "../route-geometry.js";

type Node = Record<string, unknown>;
function node(value: unknown): Node { return typeof value === "object" && value !== null && !Array.isArray(value) ? value as Node : {}; }
function list(value: unknown): Node[] { return (Array.isArray(value) ? value : value === undefined ? [] : [value]).map(node); }
function string(value: unknown): string { return typeof value === "string" ? value : ""; }

const OPTION_ATTRIBUTES: Record<keyof RouteOptions, string> = {
  transportationType: "type", method: "method", direction: "direction", routeType: "routetype", order: "order", planningMethod: "planningmethod", prefix: "prefix",
};

export function routeFromCot(detail: Node, changes: string[]): RouteGeometry | string {
  const links = list(detail.link).filter((link) => link.point !== undefined);
  const coordinates = links.map((link) => parseLinkPoint(link.point));
  if (coordinates.some((position) => position === null)) return "A route point has an unreadable position.";
  const points: RouteGeometry["points"] = [];
  for (const link of links) {
    if (link.type !== undefined && link.type !== "b-m-p-w" && link.type !== "b-m-p-c") return "A route point has an unsupported type.";
    const id = string(link.uid);
    if (id === "") changes.push("a route point without an ID received a new ID");
    points.push({ id: id || randomUUID(), type: link.type === "b-m-p-w" ? "waypoint" : "checkpoint", name: string(link.callsign), remarks: string(link.remarks) });
  }
  const attributes = node(detail.link_attr);
  const options: RouteOptions = {};
  for (const [key, attribute] of Object.entries(OPTION_ATTRIBUTES)) {
    if (attributes[attribute] !== undefined) options[key as keyof RouteOptions] = string(attributes[attribute]);
  }
  const info = node(detail.__routeinfo);
  if (Object.keys(info).some((key) => key !== "__navcues")) changes.push("unsupported route extensions omitted");
  const navigationCues = list(node(info.__navcues).__navcue).map((cue) => ({
    pointId: string(cue.id), text: string(cue.text), voice: string(cue.voice),
    triggers: list(cue.trigger).map((trigger) => ({ mode: string(trigger.mode) as "d" | "t", value: parseCotNumber(trigger.value) ?? -1 })),
  }));
  const geometry: RouteGeometry = { type: "Route", coordinates: coordinates as number[][], points, options, navigationCues };
  return routeProblem(geometry) ?? geometry;
}

export function routeCotDetails(geometry: RouteGeometry, color: number, width: number) {
  return {
    link: geometry.coordinates.map((position, index) => ({
      "@_point": [position[1], position[0], ...(position[2] === undefined ? [] : [position[2]])].map(String).join(","),
      "@_uid": geometry.points[index]?.id,
      "@_type": geometry.points[index]?.type === "waypoint" ? "b-m-p-w" : "b-m-p-c",
      "@_callsign": geometry.points[index]?.name ?? "",
      "@_remarks": geometry.points[index]?.remarks ?? "",
    })),
    link_attr: { "@_color": String(color), "@_stroke": String(width),
      ...Object.fromEntries(Object.entries(geometry.options).map(([key, value]) => [`@_${OPTION_ATTRIBUTES[key as keyof RouteOptions]}`, value])),
    },
    __routeinfo: { __navcues: { __navcue: geometry.navigationCues.map((cue) => ({
      "@_id": cue.pointId, "@_text": cue.text, "@_voice": cue.voice,
      trigger: cue.triggers.map((trigger) => ({ "@_mode": trigger.mode, "@_value": String(trigger.value) })),
    })) } },
  };
}
