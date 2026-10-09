/**
 * Turns recorded positions into movement tracks without inventing movement. Recorded traffic
 * comes from TAK apps and, through them, from Meshtastic nodes, so positions may arrive late, twice,
 * out of order or only roughly placed. A track is therefore split into segments, and a line is
 * drawn only between two consecutive precise positions that are close in time and plausibly reachable.
 */

/** One recorded position as the track builder needs it. */
export interface RecordedPosition {
  uid: string;
  type: string;
  callsign: string | null;
  lat: number;
  lon: number;
  /** When the sender says the position was taken. */
  time: Date;
  /** When Core received it. */
  receivedAt: Date;
  how: string | null;
  ce: number | null;
  selfReported: boolean;
  userId: string;
}

export interface TrackPoint {
  time: Date;
  lat: number;
  lon: number;
  ce: number | null;
  delayed: boolean;
  approximate: boolean;
}

export interface Track {
  uid: string;
  /** Newest type and callsign seen in the range. */
  type: string;
  callsign: string | null;
  /** At least one position was the app's own beacon rather than a marker it placed. */
  selfReported: boolean;
  /** The user whose TAK app sent the newest position. */
  userId: string;
  pointCount: number;
  duplicatesDropped: number;
  /**
   * Ordered by time. Lines are drawn only inside a segment; a segment with one point is a lone
   * position, such as an approximate one or one surrounded by gaps.
   */
  segments: TrackPoint[][];
}

/** Default gap after which a track is no longer drawn as continuous. */
export const DEFAULT_GAP_SECONDS = 300;
/** A circular error at or above this many metres is shown as an area, not as a precise point. */
export const APPROXIMATE_CE_METRES = 100;
/** Positions that reach Core this much later than their own time are marked as delayed. */
export const DELAYED_AFTER_MS = 60_000;
/**
 * Faster apparent movement than this (about 540 km/h) is treated as a jump between unrelated fixes,
 * for example a wrong first GPS fix, and is not drawn as a line.
 */
export const MAX_PLAUSIBLE_SPEED_MPS = 150;

const EARTH_RADIUS_M = 6_371_008.8;

export function distanceMetres(a: { lat: number; lon: number }, b: { lat: number; lon: number }): number {
  const toRadians = (degrees: number): number => (degrees * Math.PI) / 180;
  const dLat = toRadians(b.lat - a.lat);
  const dLon = toRadians(b.lon - a.lon);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRadians(a.lat)) * Math.cos(toRadians(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Large circular errors (e.g. Meshtastic's reduced position precision) and human estimates (`h-e`). */
export function isApproximate(position: Pick<RecordedPosition, "ce" | "how">): boolean {
  return (position.ce !== null && position.ce >= APPROXIMATE_CE_METRES) || (position.how?.startsWith("h-e") ?? false);
}

function toPoint(position: RecordedPosition): TrackPoint {
  return {
    time: position.time,
    lat: position.lat,
    lon: position.lon,
    ce: position.ce,
    delayed: position.receivedAt.getTime() - position.time.getTime() > DELAYED_AFTER_MS,
    approximate: isApproximate(position),
  };
}

function continues(previous: TrackPoint, next: TrackPoint, gapMs: number): boolean {
  const elapsedMs = next.time.getTime() - previous.time.getTime();
  if (elapsedMs > gapMs) {
    return false;
  }
  return distanceMetres(previous, next) <= (MAX_PLAUSIBLE_SPEED_MPS * Math.max(elapsedMs, 1000)) / 1000;
}

function buildTrack(positions: RecordedPosition[], gapMs: number): Track {
  // Delayed mesh positions arrive after newer ones; the sender's time puts them back in place.
  const ordered = [...positions].sort((a, b) => a.time.getTime() - b.time.getTime() || a.receivedAt.getTime() - b.receivedAt.getTime());
  const segments: TrackPoint[][] = [];
  let current: TrackPoint[] = [];
  let duplicatesDropped = 0;
  let lastTime = Number.NaN;
  for (const position of ordered) {
    // The same fix relayed twice carries the same time; keep the first that arrived.
    if (position.time.getTime() === lastTime) {
      duplicatesDropped += 1;
      continue;
    }
    lastTime = position.time.getTime();
    const point = toPoint(position);
    const previous = current.at(-1);
    if (point.approximate || (previous !== undefined && !continues(previous, point, gapMs))) {
      if (current.length > 0) {
        segments.push(current);
      }
      current = [];
    }
    if (point.approximate) {
      segments.push([point]);
    } else {
      current.push(point);
    }
  }
  if (current.length > 0) {
    segments.push(current);
  }
  const newest = ordered.at(-1) as RecordedPosition;
  return {
    uid: newest.uid,
    type: newest.type,
    callsign: [...ordered].reverse().find(({ callsign }) => callsign !== null)?.callsign ?? null,
    selfReported: ordered.some(({ selfReported }) => selfReported),
    userId: newest.userId,
    pointCount: ordered.length - duplicatesDropped,
    duplicatesDropped,
    segments,
  };
}

/** Groups positions by CoT UID into tracks, ordered by callsign (then UID). */
export function buildTracks(positions: readonly RecordedPosition[], gapSeconds = DEFAULT_GAP_SECONDS): Track[] {
  const byUid = new Map<string, RecordedPosition[]>();
  for (const position of positions) {
    const list = byUid.get(position.uid);
    if (list === undefined) {
      byUid.set(position.uid, [position]);
    } else {
      list.push(position);
    }
  }
  return [...byUid.values()]
    .map((list) => buildTrack(list, gapSeconds * 1000))
    .sort((a, b) => (a.callsign ?? a.uid).localeCompare(b.callsign ?? b.uid) || a.uid.localeCompare(b.uid));
}
