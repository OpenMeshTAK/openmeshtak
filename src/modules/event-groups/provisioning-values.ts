/**
 * ATAK team colors as listed by the upstream Meshtastic `atak.proto` `Team` enum, using the
 * display names ATAK writes into CoT `__group` elements. Verified 2026-10-04.
 */
export type TakTeam =
  | "White"
  | "Yellow"
  | "Orange"
  | "Magenta"
  | "Red"
  | "Maroon"
  | "Purple"
  | "Dark Blue"
  | "Blue"
  | "Cyan"
  | "Teal"
  | "Green"
  | "Dark Green"
  | "Brown";

/** ATAK member roles from the upstream Meshtastic `atak.proto` `MemberRole` enum. */
export type TakRole =
  | "Team Member"
  | "Team Lead"
  | "HQ"
  | "Sniper"
  | "Medic"
  | "Forward Observer"
  | "RTO"
  | "K9";

/**
 * Non-deprecated Meshtastic `Config.DeviceConfig.Role` values from upstream `config.proto`.
 * `ROUTER_CLIENT` and `REPEATER` are deprecated upstream and intentionally excluded.
 */
export type MeshtasticDeviceRole =
  | "CLIENT"
  | "CLIENT_MUTE"
  | "CLIENT_HIDDEN"
  | "CLIENT_BASE"
  | "ROUTER"
  | "ROUTER_LATE"
  | "TRACKER"
  | "SENSOR"
  | "TAK"
  | "TAK_TRACKER"
  | "LOST_AND_FOUND";

/** Upstream nanopb limits include the terminating null byte, hence one less than max_size. */
export const MESHTASTIC_LONG_NAME_MAX_BYTES = 39;
export const MESHTASTIC_SHORT_NAME_MAX_BYTES = 4;
export const MESHTASTIC_MAX_CHANNELS = 8;

export const CALLSIGN_PLACEHOLDERS = ["{username}", "{group}"] as const;
