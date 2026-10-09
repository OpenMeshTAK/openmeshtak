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
  /**
   * Part of the current picture, such as a position, marker, route or drawing, kept for late
   * joiners and the live view. Chat messages and control events such as pings are not.
   */
  isMapItem: boolean;
  /** UIDs of items the client deleted (`t-x-d-d` with `detail/link`). */
  deletedUids: string[];
  /** The TAK Protocol version a `t-x-takp-q` asks for; such negotiation events are never forwarded. */
  protocolRequest: number | null;
  /** WGS84 position of the point. */
  lat: number;
  lon: number;
  /** Display name from `detail/contact` for positions, or from `detail/contact` of markers when set. */
  callsign: string | null;
  /** The sending app's own description from `detail/takv`, present in its position beacon. */
  software: CotSoftware | null;
  time: Date;
  stale: Date;
  /** The explicit recipients from `detail/marti/dest`, or null when the event goes to everyone. */
  destinations: CotDestinations | null;
  xml: string;
}

/**
 * Recipients a client addressed by callsign or device UID, such as a direct GeoChat message or a
 * marker sent to one person. Destinations the server cannot resolve, such as missions, leave the
 * lists empty so the event reaches nobody instead of everyone.
 */
export interface CotDestinations {
  callsigns: string[];
  uids: string[];
  /** Mission names (`dest mission`): the event goes into the mission and to its subscribers. */
  missions: string[];
}

/** `detail/takv`: device model, TAK app, its version and the operating system, as the app reports them. */
export interface CotSoftware {
  device: string | null;
  platform: string | null;
  version: string | null;
  os: string | null;
}

const MAX_DESTINATIONS = 100;
const MAX_SOFTWARE_LENGTH = 100;

const MAX_UID_LENGTH = 200;

function attribute(node: XmlNode, name: string): string | null {
  const value = node[name];
  return typeof value === "string" && value.length > 0 ? value : null;
}

function nodes(value: unknown): XmlNode[] {
  const list: unknown[] = Array.isArray(value) ? value : [value];
  return list.filter((node): node is XmlNode => typeof node === "object" && node !== null);
}

function softwareOf(detail: XmlNode | null): CotSoftware | null {
  const takv = detail === null ? undefined : nodes(detail.takv)[0];
  if (takv === undefined) {
    return null;
  }
  const value = (name: string): string | null => attribute(takv, name)?.slice(0, MAX_SOFTWARE_LENGTH) ?? null;
  return { device: value("device"), platform: value("platform"), version: value("version"), os: value("os") };
}

function protocolRequestOf(type: string, detail: XmlNode | null): number | null {
  if (type !== "t-x-takp-q" || detail === null) {
    return null;
  }
  const request = nodes(detail.TakControl).flatMap((control) => nodes(control.TakRequest))[0];
  const version = request === undefined ? Number.NaN : Number(attribute(request, "version"));
  return Number.isSafeInteger(version) ? version : null;
}

function deletedUidsOf(type: string, detail: XmlNode | null): string[] {
  if (type !== "t-x-d-d" || detail === null) {
    return [];
  }
  return nodes(detail.link)
    .slice(0, MAX_DESTINATIONS)
    .map((link) => attribute(link, "uid"))
    .filter((uid) => uid !== null);
}

function destinationsOf(detail: XmlNode | null): CotDestinations | null {
  const dests = (detail === null ? [] : nodes(detail.marti)).flatMap((marti) => nodes(marti.dest));
  if (dests.length === 0) {
    return null;
  }
  const limited = dests.slice(0, MAX_DESTINATIONS);
  return {
    callsigns: limited.map((dest) => attribute(dest, "callsign")).filter((value) => value !== null),
    uids: limited.map((dest) => attribute(dest, "uid")).filter((value) => value !== null),
    missions: limited.map((dest) => attribute(dest, "mission")).filter((value) => value !== null),
  };
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
  const detail = nodes(event.detail)[0] ?? null;
  const contact = detail === null ? undefined : (detail.contact as XmlNode | undefined);
  const hasContact = typeof contact === "object" && contact !== null;
  return {
    uid,
    type,
    isPing: type === "t-x-c-t",
    // Markers carry a contact callsign too; only an app's own beacon names its software (`takv`)
    // or its contact endpoint.
    isSituationalAwareness: hasContact && type.startsWith("a-") && (detail?.takv !== undefined || attribute(contact, "endpoint") !== null),
    isMapItem: !type.startsWith("t-") && !type.startsWith("b-t-f"),
    deletedUids: deletedUidsOf(type, detail),
    protocolRequest: protocolRequestOf(type, detail),
    lat: Number(attribute(point, "lat")),
    lon: Number(attribute(point, "lon")),
    callsign: hasContact ? (attribute(contact, "callsign")?.slice(0, 100) ?? null) : null,
    software: softwareOf(detail),
    time: new Date(attribute(event, "time") ?? ""),
    stale: new Date(attribute(event, "stale") ?? ""),
    destinations: destinationsOf(detail),
    xml,
  };
}

function escapeAttribute(value: string): string {
  return value.replace(/[<>&"']/g, (character) => `&#${String(character.charCodeAt(0))};`);
}

function controlEvent(uid: string, type: string, control: string, now: Date): string {
  const time = now.toISOString();
  const stale = new Date(now.getTime() + 60_000).toISOString();
  return (
    `<?xml version="1.0" encoding="UTF-8"?><event version="2.0" uid="${escapeAttribute(uid)}" type="${type}" how="m-g" ` +
    `time="${time}" start="${time}" stale="${stale}"><point lat="0.0" lon="0.0" hae="0.0" ce="999999" le="999999"/>` +
    `<detail><TakControl>${control}</TakControl></detail></event>`
  );
}

/** Tells a client once per connection that it may switch to TAK Protocol version 1. */
export function protocolSupportOffer(negotiationUid: string, now = new Date()): string {
  return controlEvent(negotiationUid, "t-x-takp-v", '<TakProtocolSupport version="1"/>', now);
}

/** Accepts or refuses a client's request to switch the TAK Protocol version. */
export function protocolResponse(negotiationUid: string, accepted: boolean, now = new Date()): string {
  return controlEvent(negotiationUid, "t-x-takp-r", `<TakResponse status="${String(accepted)}"/>`, now);
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
