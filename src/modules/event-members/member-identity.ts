import { ProblemError, type ProblemFieldError } from "../../shared/errors/problem-error.js";
import {
  MESHTASTIC_LONG_NAME_MAX_BYTES,
  MESHTASTIC_SHORT_NAME_MAX_BYTES,
} from "../event-groups/provisioning-values.js";

export function utf8Length(value: string): number {
  return Buffer.byteLength(value, "utf8");
}

/** Renders a validated callsign format. Placeholders were restricted when the format was saved. */
export function renderCallsign(format: string, username: string, groupName: string): string {
  return format.replaceAll("{username}", username).replaceAll("{group}", groupName).trim();
}

/** The callsign doubles as the Meshtastic long name, so it must fit the upstream byte limit. */
export function callsignFits(callsign: string): boolean {
  return callsign.length > 0 && utf8Length(callsign) <= MESHTASTIC_LONG_NAME_MAX_BYTES;
}

/**
 * Picks the smallest free positive number so short names stay as short as possible. A member keeps
 * its number while it stays in the group; numbers of departed members become free again.
 */
export function nextShortNameNumber(usedNumbers: Iterable<number>): number {
  const used = new Set(usedNumbers);
  let candidate = 1;
  while (used.has(candidate)) {
    candidate += 1;
  }
  return candidate;
}

export function shortNameFor(prefix: string | null, number: number): string | null {
  return prefix === null ? null : `${prefix}${String(number)}`;
}

export function shortNameFits(prefix: string | null, number: number): boolean {
  const shortName = shortNameFor(prefix ?? "", number) ?? "";
  return utf8Length(shortName) <= MESHTASTIC_SHORT_NAME_MAX_BYTES;
}

export function memberIdentityConflictProblem(errors: ProblemFieldError[]): ProblemError {
  return new ProblemError({
    type: "urn:openmeshtak:problem:member-identity-conflict",
    title: "Member callsigns or short names would be invalid",
    status: 409,
    detail: "The change would give members duplicate, oversized or impossible names.",
    code: "MEMBER_IDENTITY_CONFLICT",
    errors,
  });
}
