export interface FirmwareProfileSummaryDto {
  /** Stable profile id such as `meshtastic-2.8`. */
  id: string;
  /** Firmware line such as `2.8`. */
  line: string;
  /** Lowest supported patch of the line, e.g. `2.8.1`. */
  minVersion: string;
  /** Patches verified on a real device. Newer patches are allowed but not verified. */
  testedVersions: string[];
  channel: "stable" | "beta" | "alpha";
  default: boolean;
  flasherUrl: string;
}

export interface FirmwareFieldDto {
  /** Path in the Meshtastic `DeviceProfile`, e.g. `config.lora.hopLimit`. */
  key: string;
  section: string;
  type: "string" | "integer" | "number" | "boolean" | "enum" | "bytes";
  label: string;
  description?: string;
  unit?: string;
  /** First patch that has the field; hidden while the event's minimum version is lower. */
  since: string;
  /** Resolved per member by OpenMeshTak and never editable. */
  managed: boolean;
  maxBytes?: number;
  min?: number;
  max?: number;
  /** Name of the enum in `enums`. */
  enum?: string;
  default?: string | number | boolean;
}

export interface FirmwareSectionDto {
  id: string;
  label: string;
}

export interface FirmwareProfileDto extends FirmwareProfileSummaryDto {
  flashingNotes: string | null;
  /** SHA-256 of the profile file, recorded in configuration revisions. */
  sha256: string;
  sections: FirmwareSectionDto[];
  fields: FirmwareFieldDto[];
  enums: Record<string, string[]>;
}
