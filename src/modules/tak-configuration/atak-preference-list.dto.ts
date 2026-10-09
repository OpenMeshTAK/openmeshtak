import type { Uuid } from "../../shared/http/uuid.js";

export type AtakPreferenceTypeDto = "string" | "boolean" | "integer" | "long" | "float";

/** Who an entry is for. Targets are event memberships, never OpenMeshTak accounts. */
export interface AtakPreferenceTargetDto {
  type: "event" | "group" | "role" | "member";
  /** The event group, role or member; `null` for the whole event. */
  id: Uuid | null;
}

/** One ATAK preference the event sends, as a `.pref` file stores it. */
export interface AtakPreferenceEntryDto {
  target: AtakPreferenceTargetDto;
  /**
   * The `<preference name>` group, usually `com.atakmap.app_preferences`.
   * @maxLength 200
   */
  preference: string;
  /** @maxLength 200 */
  key: string;
  /** The Java class ATAK stores; known keys must use the catalog's type. */
  type: AtakPreferenceTypeDto;
  /** @maxLength 10000 */
  value: string;
}

/**
 * The ATAK preferences every member's app receives through its device profile once a
 * configuration revision is published. For one member the most specific entry wins per key:
 * member, then role, then group, then the whole event. Removing an entry does not change a device;
 * set ATAK's default instead.
 */
export interface AtakPreferenceListDto {
  eventId: Uuid;
  entries: AtakPreferenceEntryDto[];
  /** Optimistic-concurrency version; 0 until first saved. */
  version: number;
  /** @format date-time */
  updatedAt: string | null;
}

export interface ReplaceAtakPreferencesRequest {
  /**
   * Version the client last read.
   * @isInt
   * @minimum 0
   */
  version: number;
  /** @maxItems 2000 */
  entries: AtakPreferenceEntryDto[];
}

export interface ImportAtakPreferencesRequest {
  /**
   * Version the client last read.
   * @isInt
   * @minimum 0
   */
  version: number;
  /** @maxLength 200 */
  fileName: string;
  /**
   * The `.pref` file's text, such as ATAK's settings export.
   * @maxLength 262144
   */
  content: string;
}

export interface SkippedAtakPreferenceDto {
  key: string;
  message: string;
}

export interface ImportAtakPreferencesResponse {
  list: AtakPreferenceListDto;
  /** Entries added to the whole event or replacing an event-wide entry of the same key. */
  importedCount: number;
  /** Keys left out because OpenMeshTak sets them, they hold a secret or they belong to one person or device. */
  removedKeys: string[];
  /** Keys left out because their type or value does not match what ATAK expects. */
  invalidKeys: SkippedAtakPreferenceDto[];
}

export interface AtakCatalogValueDto {
  value: string;
  label: string;
}

export interface AtakCatalogKeyDto {
  key: string;
  /** Subgroup within the topic, such as "Altitude"; keys of a group are listed together. */
  group: string;
  type: AtakPreferenceTypeDto;
  /** ATAK's own default; `null` when ATAK sets none. */
  defaultValue: string | null;
  /** Allowed values of a list; `null` for free values. */
  values: AtakCatalogValueDto[] | null;
  /** Text fields ATAK reads as numbers; they are still stored as strings. */
  numeric: boolean;
  description: string;
  /** `form`: a ready field; `member`: only for one member; `warning`: allowed with a warning; `advanced`: hidden by default. */
  use: "form" | "member" | "warning" | "advanced" | null;
}

export interface AtakCatalogTopicDto {
  id: string;
  title: string;
  description: string;
  keys: AtakCatalogKeyDto[];
}

/** A settings item that stores no value of its own, such as a link to another settings screen. */
export interface AtakScreenItemDto {
  /** The item ID that `disablePreferenceItem_<id>` and `hidePreferenceItem_<id>` name. */
  id: string;
  /** Where the item is in ATAK, such as "Settings → Network". */
  area: string;
  description: string;
}

/**
 * The ATAK preference keys this Core release knows, by topic, all in
 * `com.atakmap.app_preferences`. Other keys, such as plugin keys, may still be set.
 *
 * Every catalog key and every screen item can also be greyed out or hidden in ATAK's settings
 * screens with the Boolean entries `disablePreferenceItem_<key>` and `hidePreferenceItem_<key>`;
 * other item IDs are refused.
 */
export interface AtakPreferenceCatalogDto {
  /** The ATAK version the catalog was read from. */
  atakVersion: string;
  topics: AtakCatalogTopicDto[];
  /** Settings items without a value key that can be greyed out or hidden as well. */
  screenItems: AtakScreenItemDto[];
  /** Keys an event can never set, with the reason. */
  blockedKeys: Array<{ key: string; reason: string }>;
}
