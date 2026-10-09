import type { Uuid } from "../../shared/http/uuid.js";

/**
 * ATAK display settings an event sets for its members; `null` leaves the setting to the
 * uploaded preference file or to ATAK's default.
 */
export interface AtakSettingsDto {
  coordinateFormat: "MGRS" | "DD" | "DM" | "DMS" | "UTM" | null;
  altitudeReference: "HAE" | "MSL" | null;
  altitudeUnit: "feet" | "meters" | null;
  speedUnit: "mph" | "kmh" | "knots" | "mps" | null;
  distanceUnit: "imperial" | "metric" | "nautical" | null;
  northReference: "true" | "magnetic" | "grid" | null;
}

/** One preference of an uploaded ATAK `.pref` file. */
export interface AtakPreferenceDto {
  /** The `<preference name>` group, such as `com.atakmap.app_preferences`. */
  preference: string;
  key: string;
  type: "string" | "boolean" | "integer" | "long" | "float";
  value: string;
}

export interface AtakPreferenceFileDto {
  fileName: string;
  /** The file's entries after removing keys OpenMeshTak owns. */
  entries: AtakPreferenceDto[];
}

/**
 * TAK settings of an event. Every event sends TAK clients to the built-in TAK server; Meshtastic
 * events (`meshtasticEnabled` on the event) also connect them to the Meshtastic app's local TAK
 * server, which carries CoT over the mesh channel. ATAK preferences reach members through the
 * device profiles once a configuration revision is published.
 */
export interface TakConfigurationDto {
  eventId: Uuid;
  /** Channel for the app's "TAK Mesh Channel"; `null` uses the primary channel. */
  meshChannelId: Uuid | null;
  atakSettings: AtakSettingsDto;
  /** `null` until a preference file is uploaded. */
  atakPreferenceFile: AtakPreferenceFileDto | null;
  /** Optimistic-concurrency version; 0 until first saved. */
  version: number;
  /** @format date-time */
  updatedAt: string | null;
}

export interface UpdateTakConfigurationRequest {
  /**
   * Version the client last read.
   * @isInt
   * @minimum 0
   */
  version: number;
  meshChannelId: Uuid | null;
  /** Omit to keep the current settings. */
  atakSettings?: AtakSettingsDto;
}

export interface AtakPreferenceFileUpload {
  /** @maxLength 200 */
  fileName: string;
  /**
   * The `.pref` file's text.
   * @maxLength 262144
   */
  content: string;
}

export interface UpdateAtakPreferenceFileRequest {
  /**
   * Version the client last read.
   * @isInt
   * @minimum 0
   */
  version: number;
  /** `null` removes the file. */
  file: AtakPreferenceFileUpload | null;
}

export interface UpdateAtakPreferenceFileResponse {
  configuration: TakConfigurationDto;
  /** Keys of the uploaded file that were removed because OpenMeshTak sets them per member. */
  removedKeys: string[];
}
