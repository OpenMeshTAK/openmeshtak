import { XMLParser } from "fast-xml-parser";
import { validationProblem } from "../../shared/errors/problem-error.js";
import type { TakRole, TakTeam } from "../event-groups/provisioning-values.js";
import { BLOCKED_ATAK_PREFERENCES } from "./atak-preference-catalog.js";

/** One ATAK preference as a `.pref` file stores it. */
export interface AtakPreference {
  /** The `<preference name>` group, such as `com.atakmap.app_preferences`. */
  preference: string;
  key: string;
  type: AtakPreferenceType;
  value: string;
}

export type AtakPreferenceType = "string" | "boolean" | "integer" | "long" | "float";

const JAVA_CLASSES: Record<string, AtakPreferenceType> = {
  "class java.lang.String": "string",
  "class java.lang.Boolean": "boolean",
  "class java.lang.Integer": "integer",
  "class java.lang.Long": "long",
  "class java.lang.Float": "float",
};
const CLASS_OF: Record<AtakPreferenceType, string> = {
  string: "class java.lang.String",
  boolean: "class java.lang.Boolean",
  integer: "class java.lang.Integer",
  long: "class java.lang.Long",
  float: "class java.lang.Float",
};

export const APP_PREFERENCES = "com.atakmap.app_preferences";
export const MAX_PREFERENCE_FILE_BYTES = 256 * 1024;
export const MAX_ENTRIES = 2000;
export const MAX_KEY_LENGTH = 200;
export const MAX_VALUE_LENGTH = 10_000;

/**
 * Keys OpenMeshTak sets itself or that belong to one person or device. A `.pref` exported from an
 * administrator's own ATAK carries that person's server connection, certificates, callsign, team
 * and role; handing those to every member would break their connection or impersonate the
 * administrator, so they are always removed. Callsign, team and role come from each member's
 * event membership instead (`takIdentityPreferences`).
 */
const OWNED_PREFERENCE_GROUPS = new Set(["cot_streams"]);
const BLOCKED_KEYS = new Set(BLOCKED_ATAK_PREFERENCES.map(({ key }) => key));
const OWNED_KEYS = new Set([
  "apiSecureServerPort",
  "deviceProfileEnableOnConnect",
  "caLocation",
  "certificateLocation",
  "locationCallsign",
  "locationTeam",
  "atakRoleType",
  "bestDeviceUID",
]);

/** Keys an event may never send, from the preference file or the entry list. */
export function isOwnedKey(key: string): boolean {
  return OWNED_KEYS.has(key) || BLOCKED_KEYS.has(key) || /password/i.test(key);
}

/** The `cot_streams` group is the server connection, which OpenMeshTak sets itself. */
export function isOwnedPreferenceGroup(preference: string): boolean {
  return OWNED_PREFERENCE_GROUPS.has(preference);
}

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "",
  parseTagValue: false,
  parseAttributeValue: false,
  textNodeName: "#text",
  isArray: (name) => name === "preference" || name === "entry",
});

type XmlNode = Record<string, unknown>;

function invalid(message: string): never {
  throw validationProblem([{ field: "content", code: "INVALID_PREFERENCE_FILE", message }]);
}

function textOf(entry: XmlNode): string {
  const text = entry["#text"];
  return typeof text === "string" ? text.trim() : "";
}

/**
 * Reads an ATAK `.pref` file such as ATAK's preference export. Entries OpenMeshTak owns are
 * dropped and reported, so the administrator sees what will not be sent.
 */
export function parseAtakPreferenceFile(content: string): { entries: AtakPreference[]; removedKeys: string[] } {
  if (Buffer.byteLength(content, "utf8") > MAX_PREFERENCE_FILE_BYTES) {
    invalid("The file is larger than 256 KB.");
  }
  if (/<!DOCTYPE|<!ENTITY/i.test(content)) {
    invalid("The file must not contain a DOCTYPE.");
  }
  let document: XmlNode;
  try {
    document = parser.parse(content, true) as XmlNode;
  } catch {
    invalid("The file is not valid XML.");
  }
  const root = document.preferences;
  if (typeof root !== "object" || root === null) {
    invalid("The file has no <preferences> element. Export the settings from ATAK as a .pref file.");
  }
  const entries: AtakPreference[] = [];
  const removedKeys: string[] = [];
  for (const group of ((root as XmlNode).preference ?? []) as XmlNode[]) {
    const preference = typeof group.name === "string" ? group.name : "";
    for (const entry of (group.entry ?? []) as XmlNode[]) {
      const key = typeof entry.key === "string" ? entry.key : "";
      const type = JAVA_CLASSES[typeof entry.class === "string" ? entry.class : ""];
      if (preference === "" || key === "" || key.length > MAX_KEY_LENGTH || type === undefined) {
        invalid(`The entry "${key.slice(0, 50)}" has no supported key, group or class.`);
      }
      const value = textOf(entry);
      if (value.length > MAX_VALUE_LENGTH) {
        invalid(`The value of "${key}" is too long.`);
      }
      if (OWNED_PREFERENCE_GROUPS.has(preference) || isOwnedKey(key)) {
        removedKeys.push(key);
        continue;
      }
      entries.push({ preference, key, type, value });
    }
  }
  if (entries.length > MAX_ENTRIES) {
    invalid(`The file has more than ${String(MAX_ENTRIES)} entries.`);
  }
  return { entries, removedKeys: [...new Set(removedKeys)] };
}

function identity(entry: Pick<AtakPreference, "preference" | "key">): string {
  return `${entry.preference}\u0000${entry.key}`;
}

/** Merges preference lists in order; a later list wins for the same group and key. */
export function mergeAtakPreferences(...lists: AtakPreference[][]): AtakPreference[] {
  const merged = new Map<string, AtakPreference>();
  for (const entry of lists.flat()) {
    merged.delete(identity(entry));
    merged.set(identity(entry), entry);
  }
  return [...merged.values()];
}

/** Who an entry is for: the whole event, or one event group, role or member. */
export type AtakPreferenceTarget = { type: "event" } | { type: "group" | "role" | "member"; id: string };

/** An event's preference with its target, as stored and published. */
export interface TargetedAtakPreference extends AtakPreference {
  target: AtakPreferenceTarget;
}

/** The member a targeted list is resolved for. */
export interface PreferenceRecipient {
  memberId: string;
  eventRoleId: string;
  eventGroupId: string;
}

const SPECIFICITY: Record<AtakPreferenceTarget["type"], number> = { event: 0, group: 1, role: 2, member: 3 };

function reaches(target: AtakPreferenceTarget, recipient: PreferenceRecipient): boolean {
  switch (target.type) {
    case "event":
      return true;
    case "group":
      return target.id === recipient.eventGroupId;
    case "role":
      return target.id === recipient.eventRoleId;
    case "member":
      return target.id === recipient.memberId;
  }
}

/**
 * One event's preferences for one member. For the same key the most specific entry wins: member,
 * then role, then group, then the whole event. Every member has exactly one role and one group,
 * so there is never a tie.
 */
export function resolveAtakPreferences(entries: TargetedAtakPreference[], recipient: PreferenceRecipient): AtakPreference[] {
  const matching = entries
    .filter(({ target }) => reaches(target, recipient))
    .sort((a, b) => SPECIFICITY[a.target.type] - SPECIFICITY[b.target.type]);
  return mergeAtakPreferences(matching.map(({ preference, key, type, value }) => ({ preference, key, type, value })));
}

function escapeXml(value: string): string {
  return value.replace(/[<>&"']/g, (character) => `&#${String(character.charCodeAt(0))};`);
}

/** What OpenMeshTak decides about a member's TAK identity. */
export interface TakIdentity {
  callsign: string;
  team: TakTeam;
  role: TakRole;
}

/**
 * The member's callsign, team color and role as ATAK stores them. Our team and role names are the
 * values of ATAK's own `locationTeam` and `atakRoleType` lists, so they need no mapping.
 */
export function takIdentityPreferences(identity: TakIdentity): AtakPreference[] {
  return [
    { preference: APP_PREFERENCES, key: "locationCallsign", type: "string", value: identity.callsign },
    { preference: APP_PREFERENCES, key: "locationTeam", type: "string", value: identity.team },
    { preference: APP_PREFERENCES, key: "atakRoleType", type: "string", value: identity.role },
  ];
}

/** `<entry>` lines of one preference group. */
export function preferenceEntriesXml(entries: AtakPreference[]): string {
  return entries
    .map(({ key, type, value }) => `    <entry key="${escapeXml(key)}" class="${CLASS_OF[type]}">${escapeXml(value)}</entry>`)
    .join("\n");
}
