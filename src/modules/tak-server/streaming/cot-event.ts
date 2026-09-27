import { XMLParser } from "fast-xml-parser";

type XmlNode = Record<string, unknown>;

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "",
  parseTagValue: false,
  parseAttributeValue: false,
  // Only the five predefined XML entities; events with a DOCTYPE are rejected before parsing.
  processEntities: true,
});

/** The parts of a CoT event the server needs for routing; the event itself is forwarded unchanged. */
export interface CotEvent {
  uid: string;
  type: string;
  /** Ping from a TAK app that expects a pong instead of being forwarded. */
  isPing: boolean;
  /** Self-reported position and identity (the app's "SA" beacon), kept for late joiners. */
  isSituationalAwareness: boolean;
  /** WGS84 position of the point. */
  lat: number;
  lon: number;
  /** Display name from `detail/contact` for positions, or from `detail/contact` of markers when set. */
  callsign: string | null;
  time: Date;
  stale: Date;
  xml: string;
}

const MAX_UID_LENGTH = 200;

function attribute(node: XmlNode, name: string): string | null {
  const value = node[name];
  return typeof value === "string" && value.length > 0 ? value : null;
}

function isTime(value: string | null): boolean {
  return value !== null && !Number.isNaN(Date.parse(value));
}

function isCoordinate(value: string | null, limit: number): boolean {
  const number = value === null ? Number.NaN : Number(value);
  return Number.isFinite(number) && Math.abs(number) <= limit;
}

/**
 * Parses one framed event. Anything that is not a well-formed CoT `event` with uid, type, times
 * and a point is dropped, so malformed or hostile input never reaches other clients.
 */
export function parseCotEvent(xml: string): CotEvent | null {
  if (/<!DOCTYPE|<!ENTITY/i.test(xml)) {
    return null;
  }
  let document: XmlNode;
  try {
    document = parser.parse(xml, true) as XmlNode;
  } catch {
    return null;
  }
  const event = document.event as XmlNode | undefined;
  if (typeof event !== "object" || event === null) {
    return null;
  }
  const uid = attribute(event, "uid");
  const type = attribute(event, "type");
  const point = event.point as XmlNode | undefined;
  if (
    uid === null ||
    uid.length > MAX_UID_LENGTH ||
    type === null ||
    !isTime(attribute(event, "time")) ||
    !isTime(attribute(event, "start")) ||
    !isTime(attribute(event, "stale")) ||
    typeof point !== "object" ||
    point === null ||
    !isCoordinate(attribute(point, "lat"), 90) ||
    !isCoordinate(attribute(point, "lon"), 180)
  ) {
    return null;
  }
  const detail = event.detail as XmlNode | undefined;
  const contact = typeof detail === "object" && detail !== null ? (detail.contact as XmlNode | undefined) : undefined;
  const hasContact = typeof contact === "object" && contact !== null;
  return {
    uid,
    type,
    isPing: type === "t-x-c-t",
    isSituationalAwareness: hasContact && type.startsWith("a-"),
    lat: Number(attribute(point, "lat")),
    lon: Number(attribute(point, "lon")),
    callsign: hasContact ? (attribute(contact, "callsign")?.slice(0, 100) ?? null) : null,
    time: new Date(attribute(event, "time") ?? ""),
    stale: new Date(attribute(event, "stale") ?? ""),
    xml,
  };
}

function escapeAttribute(value: string): string {
  return value.replace(/[<>&"']/g, (character) => `&#${String(character.charCodeAt(0))};`);
}

/** The pong a TAK server answers a client ping with. */
export function pongFor(ping: CotEvent, now = new Date()): string {
  const time = now.toISOString();
  const stale = new Date(now.getTime() + 10_000).toISOString();
  return (
    `<?xml version="1.0" encoding="UTF-8"?><event version="2.0" uid="${escapeAttribute(ping.uid)}-pong" type="t-x-c-t-r" how="h-g-i-g-o" ` +
    `time="${time}" start="${time}" stale="${stale}"><point lat="0" lon="0" hae="0" ce="9999999" le="9999999"/></event>`
  );
}
