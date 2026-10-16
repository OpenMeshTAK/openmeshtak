/**
 * Pure rules for uplinked Meshtastic observations: which times to trust, how long a position stays
 * current and how precise it is. The HQ that heard a packet is trusted for when it heard it; the
 * node's own clock is not, because nodes without GPS time report wrong or zero times.
 */

/** Meshtastic's default position broadcast interval, used when the event leaves it at 0. */
export const DEFAULT_POSITION_INTERVAL_SECONDS = 900;
/** Packets are remembered this long to drop repeats; older observations cannot be deduplicated and are rejected. */
export const DEDUPE_WINDOW_MS = 7 * 86_400_000;
/** HQ clocks may run a little ahead of Core. */
const MAX_FUTURE_SKEW_MS = 2 * 60_000;
/** A packet time this much before the HQ receive time is still plausible: mesh relays take a while. */
const MAX_PACKET_AGE_MS = 10 * 60_000;
/** A packet time this much after the HQ receive time is still plausible: small clock differences. */
const MAX_PACKET_LEAD_MS = 60_000;
const MIN_STALE_MS = 5 * 60_000;
const MAX_STALE_MS = 2 * 3_600_000;
/** Metres of uncertainty for one bit of Meshtastic position precision: 23.3 km at 10 bits, 364 m at 16. */
const PRECISION_SCALE_M = 23_905_787;

/** RFC 3339 with an explicit offset; local times without an offset are ambiguous. */
const INSTANT = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,9})?(Z|[+-]\d{2}:\d{2})$/i;

export function parseInstant(value: string): Date | null {
  if (!INSTANT.test(value)) {
    return null;
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export type ReceiveTimeProblem = "RECEIVED_IN_FUTURE" | "TOO_OLD";

/** Why Core cannot take an HQ receive time, or null when it is usable. */
export function receiveTimeProblem(receivedAt: Date, now: Date): ReceiveTimeProblem | null {
  if (receivedAt.getTime() > now.getTime() + MAX_FUTURE_SKEW_MS) {
    return "RECEIVED_IN_FUTURE";
  }
  if (receivedAt.getTime() < now.getTime() - DEDUPE_WINDOW_MS) {
    return "TOO_OLD";
  }
  return null;
}

/** The time a position is placed at: the packet's own time when plausible, otherwise the HQ receive time. */
export function positionTime(receivedAt: Date, packetTime: Date | null): Date {
  if (packetTime === null) {
    return receivedAt;
  }
  const lead = packetTime.getTime() - receivedAt.getTime();
  return lead <= MAX_PACKET_LEAD_MS && lead >= -MAX_PACKET_AGE_MS ? packetTime : receivedAt;
}

/** The event's position interval in seconds; Meshtastic treats 0 as its default. */
export function positionIntervalSeconds(configured: unknown): number {
  return typeof configured === "number" && Number.isInteger(configured) && configured > 0 ? configured : DEFAULT_POSITION_INTERVAL_SECONDS;
}

/** How long a mesh position stays on the live map: two intervals, within sensible bounds. */
export function staleAfterMs(intervalSeconds: number): number {
  return Math.min(MAX_STALE_MS, Math.max(MIN_STALE_MS, 2 * intervalSeconds * 1000));
}

/**
 * Circular error in metres for Meshtastic's reduced position precision, or null for full
 * precision (32 bits, or 0 from firmware that does not send it).
 */
export function precisionCe(precisionBits: number | undefined): number | null {
  if (precisionBits === undefined || precisionBits <= 0 || precisionBits >= 32) {
    return null;
  }
  return Math.round(PRECISION_SCALE_M / 2 ** precisionBits);
}

/** Whether a TAK position at `takTime` is close enough to a mesh position to make the mesh one redundant. */
export function takPositionCovers(takTime: Date, meshTime: Date, intervalSeconds: number): boolean {
  return Math.abs(takTime.getTime() - meshTime.getTime()) <= intervalSeconds * 1000;
}

/** Names nodes announce are untrusted display text: control characters go, blanks become null. */
export function displayText(value: string | undefined): string | null {
  if (value === undefined) {
    return null;
  }
  // eslint-disable-next-line no-control-regex -- removing control characters is the point
  const cleaned = value.replace(/[\u0000-\u001f\u007f-\u009f]/g, "").trim();
  return cleaned.length === 0 ? null : cleaned;
}
