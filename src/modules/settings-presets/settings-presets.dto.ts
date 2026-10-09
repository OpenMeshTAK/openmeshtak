import type { Uuid } from "../../shared/http/uuid.js";
import type { PageInfo } from "../../shared/pagination/cursor.js";
import type { AtakPreferenceTargetDto, AtakPreferenceTypeDto } from "../tak-configuration/atak-preference-list.dto.js";

export type PresetKind = "meshtastic" | "tak";

/**
 * Where a preset document came from. Free text such as `note` lets a person or an assistant say
 * what they changed; Core never acts on it.
 */
export interface PresetSourceDto {
  /** @maxLength 100 */
  application?: string;
  /** @maxLength 40 */
  applicationVersion?: string;
  exportedFrom?: "event" | "library";
  /** @maxLength 1000 */
  note?: string;
}

/** Values of Meshtastic firmware-profile fields, keyed by field key. */
export interface PresetMeshtasticSettings {
  [key: string]: string | number | boolean;
}

export interface MeshtasticPresetContentDto {
  /**
   * The firmware the settings were made for, such as `2.8`. Imports check every value against the
   * target event's own firmware profile instead.
   * @maxLength 20
   */
  firmwareVersion: string;
  settings: PresetMeshtasticSettings;
}

/**
 * Who a portable ATAK preference is for. Groups and roles are named by their slug, because their
 * IDs only exist in one event; importing maps each one explicitly onto the target event.
 */
export interface PresetAtakTargetDto {
  type: "event" | "group" | "role";
  /** @maxLength 100 */
  slug?: string | undefined;
  /**
   * Display name in the source event.
   * @maxLength 200
   */
  name?: string | undefined;
}

export interface PresetAtakPreferenceDto {
  target: PresetAtakTargetDto;
  /** @maxLength 200 */
  preference: string;
  /** @maxLength 200 */
  key: string;
  type: AtakPreferenceTypeDto;
  /** @maxLength 10000 */
  value: string;
}

export interface TakPresetContentDto {
  /** @maxLength 40 */
  atakVersion?: string | undefined;
  /** @maxItems 2000 */
  atakPreferences: PresetAtakPreferenceDto[];
}

/**
 * A portable, self-describing OpenMeshTak settings preset (`format` `openmeshtak-preset`). It is not
 * an ATAK `.pref`, a Meshtastic `.cfg` or a firmware profile. It never holds channel keys,
 * passwords, fixed PINs, certificates, tokens or member-specific values.
 */
export interface PresetDocumentDto {
  /**
   * Always `openmeshtak-preset`.
   * @maxLength 40
   */
  format: string;
  /**
   * Format version; this Core reads version 1.
   * @isInt
   */
  formatVersion: number;
  kind: PresetKind;
  /** @maxLength 100 */
  name: string;
  /** @maxLength 1000 */
  description?: string;
  /**
   * Human-readable explanation of the format. Ignored on import.
   * @maxLength 4000
   */
  about?: string;
  /** @format date-time */
  exportedAt?: string;
  source?: PresetSourceDto;
  /** Present when `kind` is `meshtastic`. */
  meshtastic?: MeshtasticPresetContentDto;
  /** Present when `kind` is `tak`. */
  tak?: TakPresetContentDto;
}

export interface PresetSettingChangeDto {
  key: string;
  from: string | number | boolean | null;
  to: string | number | boolean;
}

export interface PresetSettingProblemDto {
  key: string;
  message: string;
}

export interface PreviewMeshtasticPresetRequest {
  document: PresetDocumentDto;
}

/**
 * What importing a Meshtastic preset would change in the event's draft. Only `changed` values are
 * written; invalid and unsupported values are left out and current values stay.
 */
export interface MeshtasticPresetPreviewDto {
  /** Configuration version the preview was computed on; send it with the import. */
  version: number;
  presetFirmwareVersion: string;
  eventFirmwareVersion: string;
  /** `false` when the preset was made for another firmware line than the event uses. */
  sameFirmwareLine: boolean;
  changed: PresetSettingChangeDto[];
  unchanged: string[];
  /** Values the event's firmware profile rejects; the current value stays. */
  invalid: PresetSettingProblemDto[];
  /** Keys the event's firmware cannot set: unknown, managed by OpenMeshTak, secret or newer. */
  unsupported: string[];
  /** Settings the preset does not mention; they keep their current value. */
  notInPreset: string[];
  /** Secrets set on the event. An import never changes them. */
  secretsKept: string[];
  /** Token to send with the import to confirm exactly this preview. */
  confirmation: string;
}

export interface ApplyMeshtasticPresetRequest {
  /**
   * Version the preview returned.
   * @isInt
   * @minimum 0
   */
  version: number;
  document: PresetDocumentDto;
  /** @maxLength 100 */
  confirmation: string;
}

/** Maps a group or role of a preset onto the target event; `targetId` `null` leaves its entries out. */
export interface PresetTargetMappingDto {
  type: "group" | "role";
  /** @maxLength 100 */
  slug: string;
  targetId: Uuid | null;
}

export interface PresetTargetDto {
  type: "group" | "role";
  slug: string;
  name: string;
  entryCount: number;
  /** A group or role of the target event with the same slug or name; never applied unless mapped. */
  suggestedTargetId: Uuid | null;
  /** The mapping sent with this preview; absent while unmapped. */
  mapping?: { targetId: Uuid | null };
}

export interface PresetEntryChangeDto {
  target: AtakPreferenceTargetDto;
  preference: string;
  key: string;
  type: AtakPreferenceTypeDto;
  /** The event's current value for the same target and key; `null` when the key is new. */
  from: string | null;
  to: string;
}

export interface PresetEntryProblemDto {
  target: PresetAtakTargetDto;
  key: string;
  message: string;
}

export interface PreviewTakPresetRequest {
  document: PresetDocumentDto;
  /** @maxItems 500 */
  mappings?: PresetTargetMappingDto[];
}

/**
 * What importing a TAK preset would change in the event's ATAK preference draft. Entries are merged:
 * a preset entry replaces the event's entry for the same target and key, other entries stay.
 */
export interface TakPresetPreviewDto {
  /** ATAK preference list version the preview was computed on; send it with the import. */
  version: number;
  presetAtakVersion: string | null;
  catalogAtakVersion: string;
  /** Groups and roles the preset targets; each needs an explicit mapping. */
  targets: PresetTargetDto[];
  added: PresetEntryChangeDto[];
  changed: PresetEntryChangeDto[];
  unchanged: number;
  /** Entries the catalog or the target event rejects; they are left out. */
  invalid: PresetEntryProblemDto[];
  /** Entries of groups or roles mapped to `null`. */
  skipped: number;
  /** `null` until every group and role is mapped. */
  confirmation: string | null;
}

export interface ApplyTakPresetRequest {
  /**
   * Version the preview returned.
   * @isInt
   * @minimum 0
   */
  version: number;
  document: PresetDocumentDto;
  /** @maxItems 500 */
  mappings: PresetTargetMappingDto[];
  /** @maxLength 100 */
  confirmation: string;
}

export interface SettingsPresetSummaryDto {
  id: Uuid;
  kind: PresetKind;
  name: string;
  description: string | null;
  /** Meshtastic firmware or ATAK version the preset was made for. */
  targetVersion: string | null;
  /** Number of settings or ATAK preference entries. */
  itemCount: number;
  version: number;
  /** @format date-time */
  createdAt: string;
  /** @format date-time */
  updatedAt: string;
}

export interface SettingsPresetDto extends SettingsPresetSummaryDto {
  document: PresetDocumentDto;
}

export interface SettingsPresetPage {
  items: SettingsPresetSummaryDto[];
  page: PageInfo;
}

export interface CreateSettingsPresetRequest {
  /** Name and description default to the document's. */
  document: PresetDocumentDto;
  /** @maxLength 100 */
  name?: string;
  /** @maxLength 1000 */
  description?: string | null;
}

export interface UpdateSettingsPresetRequest {
  /**
   * Version the client last read.
   * @isInt
   * @minimum 1
   */
  version: number;
  /** @maxLength 100 */
  name: string;
  /** @maxLength 1000 */
  description: string | null;
  /** Replaces the settings; omit to keep them. The kind cannot change. */
  document?: PresetDocumentDto;
}
