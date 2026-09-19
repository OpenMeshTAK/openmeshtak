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

/** Upstream nanopb limits include the terminating null byte, hence one less than max_size. */
export const MESHTASTIC_LONG_NAME_MAX_BYTES = 39;
export const MESHTASTIC_SHORT_NAME_MAX_BYTES = 4;
export const MESHTASTIC_MAX_CHANNELS = 8;

export const CALLSIGN_PLACEHOLDERS = ["{username}", "{group}"] as const;
