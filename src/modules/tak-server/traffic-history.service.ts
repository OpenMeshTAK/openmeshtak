import { recordAudit } from "../../shared/audit/audit.js";
import type { ActorContext } from "../../shared/auth/principal.js";
import { database } from "../../shared/database/database.js";
import { notFoundProblem, validationProblem } from "../../shared/errors/problem-error.js";
import { requireEventPermission } from "../events/event-access.js";
import { tracksToGeoJson, tracksToGpx, type ExportTrack } from "./traffic-history-export.js";
import { buildTracks, DEFAULT_GAP_SECONDS, type RecordedPosition, type Track } from "./traffic-history.js";
import type { DeletedTakTrafficDto, TakTrafficExportFormat, TakTrafficHistoryDto } from "./traffic-history.dto.js";

/** Positions in one history answer; enough for a few hours of a large event at the recording interval. */
export const HISTORY_MAX_POINTS = 20_000;
/** Positions in one export, the same bound as the raw traffic export. */
const EXPORT_MAX_POINTS = 50_000;
/** Longest range one request may cover. */
const MAX_RANGE_MS = 31 * 86_400_000;
/** RFC 3339 with an explicit offset; local times without an offset are ambiguous. */
const INSTANT = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d{1,9})?)?(Z|[+-]\d{2}:\d{2})$/i;

export interface TakTrafficHistoryQuery {
  from: string;
  to: string;
  groupId?: string | undefined;
  uid?: string | undefined;
  gapSeconds?: number | undefined;
}

interface Range {
  from: Date;
  to: Date;
}

function parseRange(query: TakTrafficHistoryQuery): Range {
  const from = INSTANT.test(query.from) ? new Date(query.from) : null;
  const to = INSTANT.test(query.to) ? new Date(query.to) : null;
  const errors = [];
  if (from === null || Number.isNaN(from.getTime())) {
    errors.push({ field: "from", code: "INVALID_INSTANT", message: "Use an RFC 3339 time with an offset." });
  }
  if (to === null || Number.isNaN(to.getTime())) {
    errors.push({ field: "to", code: "INVALID_INSTANT", message: "Use an RFC 3339 time with an offset." });
  }
  if (from !== null && to !== null && errors.length === 0) {
    if (to.getTime() <= from.getTime()) {
      errors.push({ field: "to", code: "RANGE_EMPTY", message: "The end must be after the start." });
    } else if (to.getTime() - from.getTime() > MAX_RANGE_MS) {
      errors.push({ field: "to", code: "RANGE_TOO_LONG", message: "A range may cover at most 31 days." });
    }
  }
  if (errors.length > 0 || from === null || to === null) {
    throw validationProblem(errors);
  }
  return { from, to };
}

/** Only positions (CoT atoms `a-…`) move; drawings and other non-atom items have no track. */
async function loadPositions(eventId: string, range: Range, query: TakTrafficHistoryQuery, limit: number): Promise<RecordedPosition[]> {
  let userIds: string[] | undefined;
  if (query.groupId !== undefined) {
    const group = await database.eventGroup.findFirst({ where: { id: query.groupId, eventId }, select: { id: true } });
    if (group === null) {
      throw notFoundProblem();
    }
    const members = await database.eventMember.findMany({ where: { eventId, eventGroupId: group.id }, select: { userId: true } });
    userIds = members.map(({ userId }) => userId);
  }
  return database.takTrafficItem.findMany({
    where: {
      eventId,
      type: { startsWith: "a-" },
      time: { gte: range.from, lte: range.to },
      ...(query.uid === undefined ? {} : { uid: query.uid }),
      ...(userIds === undefined ? {} : { userId: { in: userIds } }),
    },
    orderBy: [{ time: "asc" }, { id: "asc" }],
    take: limit,
    select: { uid: true, type: true, callsign: true, lat: true, lon: true, time: true, receivedAt: true, how: true, ce: true, selfReported: true, userId: true },
  });
}

interface Sender {
  displayName: string;
  eventGroupId: string | null;
  eventGroupName: string | null;
}

/** Names the senders; users who left the event keep their name but lose the group. */
async function sendersOf(eventId: string, tracks: readonly Track[]): Promise<Map<string, Sender>> {
  const userIds = [...new Set(tracks.map(({ userId }) => userId))];
  const [users, members] = await Promise.all([
    database.domainUser.findMany({ where: { id: { in: userIds } }, select: { id: true, displayName: true } }),
    database.eventMember.findMany({
      where: { eventId, userId: { in: userIds } },
      select: { userId: true, eventGroup: { select: { id: true, name: true } } },
    }),
  ]);
  const names = new Map(users.map(({ id, displayName }) => [id, displayName]));
  const groups = new Map(members.map(({ userId, eventGroup }) => [userId, eventGroup]));
  return new Map(
    userIds.map((userId) => [
      userId,
      {
        displayName: names.get(userId) ?? "Unknown user",
        eventGroupId: groups.get(userId)?.id ?? null,
        eventGroupName: groups.get(userId)?.name ?? null,
      },
    ]),
  );
}

function gapOf(query: TakTrafficHistoryQuery): number {
  return query.gapSeconds ?? DEFAULT_GAP_SECONDS;
}

/**
 * The event's recorded positions in a range as tracks for the timeline and replay. Requires
 * `tak-traffic.history`; like the TAK history query, every request is audited because it reveals
 * where people were. Recording itself stays an opt-in per event.
 */
export async function getTakTrafficHistory(actor: ActorContext, eventId: string, query: TakTrafficHistoryQuery): Promise<TakTrafficHistoryDto> {
  await requireEventPermission(actor.principal, eventId, "tak-traffic.history");
  const range = parseRange(query);
  const loaded = await loadPositions(eventId, range, query, HISTORY_MAX_POINTS + 1);
  const truncated = loaded.length > HISTORY_MAX_POINTS;
  const positions = truncated ? loaded.slice(0, HISTORY_MAX_POINTS) : loaded;
  const tracks = buildTracks(positions, gapOf(query));
  const [senders, groups] = await Promise.all([
    sendersOf(eventId, tracks),
    database.eventGroup.findMany({ where: { eventId }, orderBy: [{ name: "asc" }, { id: "asc" }], select: { id: true, name: true } }),
  ]);
  await recordAudit({
    actor: actor.principal,
    action: "tak-traffic.history-viewed",
    targetType: "event",
    targetId: eventId,
    result: "success",
    traceId: actor.traceId,
    metadata: { from: range.from.toISOString(), to: range.to.toISOString(), groupId: query.groupId ?? null, uid: query.uid ?? null, positions: positions.length },
  });
  return {
    from: range.from.toISOString(),
    to: range.to.toISOString(),
    gapSeconds: gapOf(query),
    truncated,
    maxPoints: HISTORY_MAX_POINTS,
    groups,
    tracks: tracks.map((track) => {
      const sender = senders.get(track.userId) as Sender;
      return {
        uid: track.uid,
        type: track.type,
        callsign: track.callsign,
        selfReported: track.selfReported,
        sender: { userId: track.userId, ...sender },
        pointCount: track.pointCount,
        duplicatesDropped: track.duplicatesDropped,
        segments: track.segments.map((segment) => segment.map((point) => ({ ...point, time: point.time.toISOString() }))),
      };
    }),
  };
}

export interface TrackExport {
  fileName: string;
  contentType: string;
  body: string;
}

/** The same tracks as GeoJSON or GPX for GIS tools, at most 50,000 positions; audited like every export. */
export async function exportTakTracks(
  actor: ActorContext,
  eventId: string,
  format: TakTrafficExportFormat,
  query: TakTrafficHistoryQuery,
): Promise<TrackExport> {
  const event = await requireEventPermission(actor.principal, eventId, "tak-traffic.export");
  const range = parseRange(query);
  const positions = await loadPositions(eventId, range, query, EXPORT_MAX_POINTS);
  const tracks = buildTracks(positions, gapOf(query));
  const senders = await sendersOf(eventId, tracks);
  const exported: ExportTrack[] = tracks.map((track) => {
    const sender = senders.get(track.userId) as Sender;
    return { ...track, senderName: sender.displayName, groupName: sender.eventGroupName };
  });
  await recordAudit({
    actor: actor.principal,
    action: "tak-traffic.exported",
    targetType: "event",
    targetId: eventId,
    result: "success",
    traceId: actor.traceId,
    metadata: { format, from: range.from.toISOString(), to: range.to.toISOString(), groupId: query.groupId ?? null, uid: query.uid ?? null, items: positions.length },
  });
  const baseName = `${event.slug}-tracks`;
  return format === "gpx"
    ? { fileName: `${baseName}.gpx`, contentType: "application/gpx+xml", body: tracksToGpx(exported) }
    : { fileName: `${baseName}.geojson`, contentType: "application/geo+json", body: JSON.stringify(tracksToGeoJson(exported)) };
}

/**
 * Deletes recorded traffic before its retention ends, for the whole event or one CoT UID, e.g.
 * when a participant asks. Requires `tak-traffic.delete`; works for archived events too.
 */
export async function deleteRecordedTakTraffic(actor: ActorContext, eventId: string, uid?: string): Promise<DeletedTakTrafficDto> {
  await requireEventPermission(actor.principal, eventId, "tak-traffic.delete");
  return database.$transaction(async (transaction) => {
    const result = await transaction.takTrafficItem.deleteMany({ where: { eventId, ...(uid === undefined ? {} : { uid }) } });
    await recordAudit(
      {
        actor: actor.principal,
        action: "tak-traffic.deleted",
        targetType: "event",
        targetId: eventId,
        result: "success",
        traceId: actor.traceId,
        metadata: { uid: uid ?? null, deleted: result.count },
      },
      transaction,
    );
    return { deleted: result.count };
  });
}
