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
 * Upstream nanopb limits include the terminating null byte, hence one less than max_size. The
 * callsign limit is the 24-byte `DeviceProfile.long_name` of the `.cfg` file (max_size 25 in
 * clientonly.options), tighter than the 39 bytes a node accepts on air, so every callsign fits the
 * device profile OpenMeshTak generates.
 */
export const MESHTASTIC_LONG_NAME_MAX_BYTES = 24;
export const MESHTASTIC_SHORT_NAME_MAX_BYTES = 4;
export const MESHTASTIC_MAX_CHANNELS = 8;

export const CALLSIGN_PLACEHOLDERS = ["{username}", "{group}"] as const;
