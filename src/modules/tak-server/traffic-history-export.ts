import type { Track, TrackPoint } from "./traffic-history.js";

/** A track as exported, with the sender names resolved by the service. */
export interface ExportTrack extends Track {
  senderName: string;
  groupName: string | null;
}

interface GeoJsonFeature {
  type: "Feature";
  geometry: { type: "LineString"; coordinates: Array<[number, number]> } | { type: "Point"; coordinates: [number, number] };
  properties: Record<string, string | number | boolean | null>;
}

/**
 * One feature per segment: a LineString where consecutive precise positions are connected, a Point
 * for a lone or approximate position. Gaps therefore stay visible in every GIS tool.
 */
export function tracksToGeoJson(tracks: readonly ExportTrack[]): { type: "FeatureCollection"; features: GeoJsonFeature[] } {
  const features = tracks.flatMap((track) =>
    track.segments.map((segment, index): GeoJsonFeature => {
      const first = segment[0] as TrackPoint;
      const last = segment.at(-1) as TrackPoint;
      return {
        type: "Feature",
        geometry:
          segment.length === 1
            ? { type: "Point", coordinates: [first.lon, first.lat] }
            : { type: "LineString", coordinates: segment.map(({ lon, lat }): [number, number] => [lon, lat]) },
        properties: {
          uid: track.uid,
          callsign: track.callsign,
          type: track.type,
          sender: track.senderName,
          group: track.groupName,
          segment: index,
          start: first.time.toISOString(),
          end: last.time.toISOString(),
          // Line coordinates cannot carry times; GPX keeps one time per point.
          times: segment.map(({ time }) => time.toISOString()).join(","),
          approximate: segment.length === 1 && first.approximate,
          ce: segment.length === 1 ? first.ce : null,
        },
      };
    }),
  );
  return { type: "FeatureCollection", features };
}

function escapeXml(value: string): string {
  return value.replace(/[<>&"']/g, (character) => `&#${String(character.charCodeAt(0))};`);
}

function gpxPoint(tag: "trkpt" | "wpt", point: TrackPoint, extra = ""): string {
  return `<${tag} lat="${point.lat.toFixed(7)}" lon="${point.lon.toFixed(7)}"><time>${point.time.toISOString()}</time>${extra}</${tag}>`;
}

/**
 * GPX 1.1 with one track per CoT UID and one `trkseg` per continuous segment. Approximate
 * positions are waypoints with their accuracy, so no tool draws a line through them.
 */
export function tracksToGpx(tracks: readonly ExportTrack[]): string {
  const name = (track: ExportTrack): string => escapeXml(track.callsign ?? track.uid);
  const waypoints = tracks.flatMap((track) =>
    track.segments
      .filter((segment) => segment.length === 1 && segment[0]?.approximate === true)
      .map((segment) => {
        const point = segment[0] as TrackPoint;
        const accuracy = point.ce === null ? "approximate position" : `approximate position, about ${String(Math.round(point.ce))} m`;
        return gpxPoint("wpt", point, `<name>${name(track)}</name><desc>${escapeXml(accuracy)}</desc>`);
      }),
  );
  const trackElements = tracks.flatMap((track) => {
    const segments = track.segments.filter((segment) => !(segment.length === 1 && segment[0]?.approximate === true));
    if (segments.length === 0) {
      return [];
    }
    const body = segments.map((segment) => `<trkseg>${segment.map((point) => gpxPoint("trkpt", point)).join("")}</trkseg>`).join("");
    return [`<trk><name>${name(track)}</name><desc>${escapeXml(`${track.uid} · ${track.senderName}`)}</desc>${body}</trk>`];
  });
  return (
    '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<gpx version="1.1" creator="OpenMeshTak" xmlns="http://www.topografix.com/GPX/1/1">' +
    waypoints.join("") +
    trackElements.join("") +
    "</gpx>\n"
  );
}
