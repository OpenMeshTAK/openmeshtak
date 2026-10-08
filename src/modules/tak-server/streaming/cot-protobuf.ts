import { BinaryReader, BinaryWriter, WireType } from "@bufbuild/protobuf/wire";
import { XMLParser, XMLValidator } from "fast-xml-parser";

/**
 * TAK Protocol version 1 payloads: one `TakMessage` protobuf per frame. The field numbers follow
 * the public TAK Protocol description so ATAK and other clients can decode them; the upstream
 * `.proto` files are not copied (they are GPL-3.0), only the wire layout is reproduced here.
 *
 * Core routes CoT as XML. Events from a Protobuf client are turned into XML before the normal
 * parser and limits see them, and XML is turned into a payload only when sent to such a client.
 * Outgoing payloads put the whole `<detail>` into `xmlDetail`, which the protocol allows and which
 * keeps every detail element exactly as received.
 */

type XmlNode = Record<string, unknown>;

const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "", parseTagValue: false, parseAttributeValue: false });

/** Typed detail messages and the XML elements they stand for, by `Detail` field number. */
interface ElementDefinition {
  element: string;
  fields: Record<number, { name: string; type: "string" | "uint32" | "double" } | undefined>;
}

const DETAIL_ELEMENTS: Record<number, ElementDefinition | undefined> = {
  2: { element: "contact", fields: { 1: { name: "endpoint", type: "string" }, 2: { name: "callsign", type: "string" } } },
  3: { element: "__group", fields: { 1: { name: "name", type: "string" }, 2: { name: "role", type: "string" } } },
  4: { element: "precisionlocation", fields: { 1: { name: "geopointsrc", type: "string" }, 2: { name: "altsrc", type: "string" } } },
  5: { element: "status", fields: { 1: { name: "battery", type: "uint32" } } },
  6: {
    element: "takv",
    fields: { 1: { name: "device", type: "string" }, 2: { name: "platform", type: "string" }, 3: { name: "os", type: "string" }, 4: { name: "version", type: "string" } },
  },
  7: { element: "track", fields: { 1: { name: "speed", type: "double" }, 2: { name: "course", type: "double" } } },
};

const EVENT_STRINGS: Record<number, string> = { 1: "type", 2: "access", 3: "qos", 4: "opex", 5: "uid", 9: "how" };
const EVENT_TIMES: Record<number, string> = { 6: "time", 7: "start", 8: "stale" };
const POINT_FIELDS: Record<number, string> = { 10: "lat", 11: "lon", 12: "hae", 13: "ce", 14: "le" };

function escapeAttribute(value: string): string {
  return value.replace(/[<>&"']/g, (character) => `&#${String(character.charCodeAt(0))};`);
}

function attributes(values: Record<string, string>): string {
  return Object.entries(values)
    .map(([name, value]) => ` ${name}="${escapeAttribute(value)}"`)
    .join("");
}

function readTime(reader: BinaryReader): string | null {
  const milliseconds = Number(reader.uint64());
  const date = new Date(milliseconds);
  return Number.isFinite(milliseconds) && !Number.isNaN(date.getTime()) ? date.toISOString() : null;
}

function readTypedElement(bytes: Uint8Array, definition: ElementDefinition): string {
  const reader = new BinaryReader(bytes);
  const values: Record<string, string> = {};
  while (reader.pos < reader.len) {
    const [number, wireType] = reader.tag();
    const field = definition.fields[number];
    if (field === undefined) {
      reader.skip(wireType, number);
    } else if (field.type === "string") {
      values[field.name] = reader.string();
    } else if (field.type === "uint32") {
      values[field.name] = String(reader.uint32());
    } else {
      values[field.name] = String(reader.double());
    }
  }
  return `<${definition.element}${attributes(values)}/>`;
}

/** Whether `xmlDetail` is the content of exactly one well-formed `<detail>` and nothing else. */
function isSafeDetail(xmlDetail: string): boolean {
  return !/<!DOCTYPE|<!ENTITY|<\?xml/i.test(xmlDetail) && XMLValidator.validate(`<detail>${xmlDetail}</detail>`) === true;
}

function readDetail(bytes: Uint8Array): string | null {
  const reader = new BinaryReader(bytes);
  let xmlDetail = "";
  const typed: Array<{ element: string; xml: string }> = [];
  while (reader.pos < reader.len) {
    const [number, wireType] = reader.tag();
    const definition = DETAIL_ELEMENTS[number];
    if (number === 1) {
      xmlDetail = reader.string();
    } else if (definition !== undefined) {
      typed.push({ element: definition.element, xml: readTypedElement(reader.bytes(), definition) });
    } else {
      reader.skip(wireType, number);
    }
  }
  if (!isSafeDetail(xmlDetail)) {
    return null;
  }
  // When a sender put an element into both places, the protocol says the xmlDetail copy wins.
  const merged = typed.filter(({ element }) => !new RegExp(`<${element}[\\s/>]`).test(xmlDetail)).map(({ xml }) => xml);
  return `<detail>${merged.join("")}${xmlDetail}</detail>`;
}

/** The CoT XML of a TAK Protocol payload, or null when it holds no usable event. */
export function takMessageToXml(payload: Uint8Array): string | null {
  try {
    const message = new BinaryReader(payload);
    let cotEvent: Uint8Array | null = null;
    while (message.pos < message.len) {
      const [number, wireType] = message.tag();
      if (number === 2 && wireType === WireType.LengthDelimited) {
        cotEvent = message.bytes();
      } else {
        message.skip(wireType, number);
      }
    }
    if (cotEvent === null) {
      return null;
    }

    const reader = new BinaryReader(cotEvent);
    const event: Record<string, string> = { version: "2.0" };
    const point: Record<string, string> = {};
    let detail = "";
    while (reader.pos < reader.len) {
      const [number, wireType] = reader.tag();
      if (EVENT_STRINGS[number] !== undefined) {
        event[EVENT_STRINGS[number]] = reader.string();
      } else if (EVENT_TIMES[number] !== undefined) {
        const time = readTime(reader);
        if (time === null) {
          return null;
        }
        event[EVENT_TIMES[number]] = time;
      } else if (POINT_FIELDS[number] !== undefined) {
        point[POINT_FIELDS[number]] = String(reader.double());
      } else if (number === 15) {
        const xml = readDetail(reader.bytes());
        if (xml === null) {
          return null;
        }
        detail = xml;
      } else {
        reader.skip(wireType, number);
      }
    }
    return `<?xml version="1.0" encoding="UTF-8"?><event${attributes(event)}><point${attributes(point)}/>${detail}</event>`;
  } catch {
    return null;
  }
}

function text(node: XmlNode, name: string): string {
  const value = node[name];
  return typeof value === "string" ? value : "";
}

function number(node: XmlNode, name: string): number {
  const value = Number(text(node, name));
  return Number.isFinite(value) ? value : 0;
}

function innerDetail(xml: string): string {
  const match = /<detail(?:\s[^>]*)?>([\s\S]*)<\/detail>/.exec(xml);
  return match?.[1]?.trim() ?? "";
}

/** The TAK Protocol payload of a CoT XML event Core already accepted, or null when it cannot be converted. */
export function xmlToTakMessage(xml: string): Uint8Array | null {
  let event: XmlNode;
  try {
    event = (parser.parse(xml) as XmlNode).event as XmlNode;
  } catch {
    return null;
  }
  if (typeof event !== "object" || event === null) {
    return null;
  }
  const point = typeof event.point === "object" && event.point !== null ? (event.point as XmlNode) : {};
  const writer = new BinaryWriter();
  writer.tag(2, WireType.LengthDelimited).fork();
  for (const [fieldNo, name] of Object.entries(EVENT_STRINGS)) {
    const value = text(event, name);
    if (value !== "") {
      writer.tag(Number(fieldNo), WireType.LengthDelimited).string(value);
    }
  }
  for (const [fieldNo, name] of Object.entries(EVENT_TIMES)) {
    writer.tag(Number(fieldNo), WireType.Varint).uint64(Math.max(0, Date.parse(text(event, name)) || 0));
  }
  for (const [fieldNo, name] of Object.entries(POINT_FIELDS)) {
    writer.tag(Number(fieldNo), WireType.Bit64).double(number(point, name));
  }
  const xmlDetail = innerDetail(xml);
  if (xmlDetail !== "") {
    writer.tag(15, WireType.LengthDelimited).fork().tag(1, WireType.LengthDelimited).string(xmlDetail).join();
  }
  writer.join();
  return writer.finish();
}
