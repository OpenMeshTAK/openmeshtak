import { XMLParser } from "fast-xml-parser";
import { validationProblem } from "../../shared/errors/problem-error.js";
import type { TakRole, TakTeam } from "../event-groups/provisioning-values.js";

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
const MAX_ENTRIES = 2000;
const MAX_KEY_LENGTH = 200;
const MAX_VALUE_LENGTH = 10_000;

/**
 * Keys OpenMeshTak sets itself or that belong to one person or device. A `.pref` exported from an
 * administrator's own ATAK carries that person's server connection, certificates, callsign, team
 * and role; handing those to every member would break their connection or impersonate the
 * administrator, so they are always removed. Callsign, team and role come from each member's
 * event membership instead (`takIdentityPreferences`).
 */
const OWNED_PREFERENCE_GROUPS = new Set(["cot_streams"]);
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

function isOwnedKey(key: string): boolean {
  return OWNED_KEYS.has(key) || /password/i.test(key);
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

/**
 * The settings form. Keys and value codes come from ATAK-CIV's unit display preferences
 * (`unit_display_preferences.xml` and its arrays); ATAK stores all of them as strings.
 */
export const ATAK_SETTINGS = {
  coordinateFormat: { key: "coord_display_pref", values: { MGRS: "MGRS", DD: "DD", DM: "DM", DMS: "DMS", UTM: "UTM" } },
  altitudeReference: { key: "alt_display_pref", values: { HAE: "HAE", MSL: "MSL" } },
  altitudeUnit: { key: "alt_unit_pref", values: { feet: "0", meters: "1" } },
  speedUnit: { key: "speed_unit_pref", values: { mph: "0", kmh: "1", knots: "2", mps: "3" } },
  distanceUnit: { key: "rab_rng_units_pref", values: { imperial: "0", metric: "1", nautical: "2" } },
  northReference: { key: "rab_north_ref_pref", values: { true: "0", magnetic: "1", grid: "2" } },
} as const;

type SettingsDefinition = typeof ATAK_SETTINGS;

/** Chosen form values; `null` leaves the setting to the file or to ATAK's default. */
export type AtakSettings = { [Name in keyof SettingsDefinition]: keyof SettingsDefinition[Name]["values"] | null };

export const EMPTY_ATAK_SETTINGS: AtakSettings = {
  coordinateFormat: null,
  altitudeReference: null,
  altitudeUnit: null,
  speedUnit: null,
  distanceUnit: null,
  northReference: null,
};

/** Stored settings, tolerating rows written before a field existed. */
export function readAtakSettings(value: unknown): AtakSettings {
  const stored = typeof value === "object" && value !== null ? (value as Record<string, unknown>) : {};
  const settings = { ...EMPTY_ATAK_SETTINGS };
  for (const name of Object.keys(ATAK_SETTINGS) as Array<keyof AtakSettings>) {
    const chosen = stored[name];
    if (typeof chosen === "string" && chosen in ATAK_SETTINGS[name].values) {
      (settings as Record<string, string | null>)[name] = chosen;
    }
  }
  return settings;
}

/** Rejects form values that are not one of the known choices. */
export function validateAtakSettings(settings: AtakSettings): void {
  const problems = (Object.keys(ATAK_SETTINGS) as Array<keyof AtakSettings>)
    .filter((name) => settings[name] !== null && !(String(settings[name]) in ATAK_SETTINGS[name].values))
    .map((name) => ({ field: `atakSettings.${name}`, code: "INVALID_VALUE", message: "Choose one of the listed values." }));
  if (problems.length > 0) {
    throw validationProblem(problems);
  }
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

/** The event's effective preferences: the file, with the form's choices on top. */
export function effectiveAtakPreferences(fileEntries: AtakPreference[], settings: AtakSettings): AtakPreference[] {
  const fromForm = (Object.keys(ATAK_SETTINGS) as Array<keyof AtakSettings>).flatMap((name) => {
    const chosen = settings[name];
    if (chosen === null) {
      return [];
    }
    const definition = ATAK_SETTINGS[name];
    const value = (definition.values as Record<string, string>)[chosen] ?? "";
    return [{ preference: APP_PREFERENCES, key: definition.key, type: "string" as const, value }];
  });
  return mergeAtakPreferences(fileEntries, fromForm);
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
