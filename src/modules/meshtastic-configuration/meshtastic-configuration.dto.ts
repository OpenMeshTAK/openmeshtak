import type { Uuid } from "../../shared/http/uuid.js";

/** Values of a firmware profile's editable fields, keyed by field key. */
export interface FirmwareSettingsDocument {
  [key: string]: string | number | boolean;
}

export interface ConfigurationProblemDto {
  field: string;
  code: string;
  message: string;
}

export interface MeshtasticConfigurationDto {
  eventId: Uuid;
  /** Recommended firmware: a line such as `2.8` or a minimum patch such as `2.8.3`. */
  firmwareVersion: string;
  /** The given patch or the profile minimum; `null` when the version is no longer supported. */
  effectiveMinimumVersion: string | null;
  profileId: string | null;
  /** `false` when no tested patch reaches the effective minimum version. */
  verified: boolean;
  settings: FirmwareSettingsDocument;
  /** Why the stored configuration is not valid for this Core release; empty when it is. */
  problems: ConfigurationProblemDto[];
  /** Optimistic-concurrency version; 0 until the configuration is first saved. */
  version: number;
  /** @format date-time */
  updatedAt: string | null;
}

export interface UpdateMeshtasticSettingsRequest {
  /**
   * Version the client last read.
   * @isInt
   * @minimum 0
   */
  version: number;
  /** Complete or partial document; missing fields take the profile default. */
  settings: FirmwareSettingsDocument;
}

export interface PreviewFirmwareChangeRequest {
  /** @maxLength 20 */
  firmwareVersion: string;
}

export interface FirmwareChangeReportDto {
  kept: string[];
  dropped: string[];
  invalid: string[];
  added: string[];
}

export interface FirmwareChangePreviewDto {
  firmwareVersion: string;
  effectiveMinimumVersion: string;
  profileId: string;
  report: FirmwareChangeReportDto;
  /**
   * Token to send with the change when it needs confirmation; `null` when only the minimum patch
   * within the same line is raised, which never drops values.
   */
  confirmation: string | null;
}

export interface ChangeFirmwareRequest {
  /**
   * Version the client last read.
   * @isInt
   * @minimum 0
   */
  version: number;
  /** @maxLength 20 */
  firmwareVersion: string;
  /** The `confirmation` of the preview the administrator accepted. */
  confirmation?: string;
}
