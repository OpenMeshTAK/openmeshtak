import { recordAudit } from "../../shared/audit/audit.js";
import type { ActorContext, Principal } from "../../shared/auth/principal.js";
import { database } from "../../shared/database/database.js";
import { isUniqueConstraintError } from "../../shared/database/unique-constraint.js";
import { versionConflictProblem } from "../../shared/errors/problem-error.js";
import { requireEventPermission } from "../events/event-access.js";
import { trafficRecorder } from "./traffic-recording.js";
import type { TakTrafficRecordingDto, UpdateTakTrafficRecordingRequest } from "./traffic-recording.dto.js";

const EXPORT_LIMIT = 50_000;

async function toDto(eventId: string): Promise<TakTrafficRecordingDto> {
  const [row, storedItems] = await Promise.all([
    database.takTrafficRecording.findUnique({ where: { eventId } }),
    database.takTrafficItem.count({ where: { eventId } }),
  ]);
  return {
    enabled: row?.enabled ?? false,
    retentionDays: row?.retentionDays ?? 30,
    storedItems,
    version: row?.version ?? 0,
  };
}

export async function getTakTrafficRecording(principal: Principal, eventId: string): Promise<TakTrafficRecordingDto> {
  await requireEventPermission(principal, eventId, "tak-traffic.view");
  return toDto(eventId);
}

/** Turns recording on or off and sets the retention. Requires `events.manage` for the event. */
export async function updateTakTrafficRecording(
  actor: ActorContext,
  eventId: string,
  input: UpdateTakTrafficRecordingRequest,
): Promise<TakTrafficRecordingDto> {
  await requireEventPermission(actor.principal, eventId, "events.manage");
  const data = { enabled: input.enabled, retentionDays: input.retentionDays };
  await database.$transaction(async (transaction) => {
    if (input.version === 0) {
      try {
        await transaction.takTrafficRecording.create({ data: { eventId, ...data } });
      } catch (error: unknown) {
        throw isUniqueConstraintError(error) ? versionConflictProblem((await toDto(eventId)).version) : error;
      }
    } else {
      const updated = await transaction.takTrafficRecording.updateMany({
        where: { eventId, version: input.version },
        data: { ...data, version: { increment: 1 } },
      });
      if (updated.count !== 1) {
        throw versionConflictProblem((await toDto(eventId)).version);
      }
    }
    await recordAudit(
      {
        actor: actor.principal,
        action: "tak-traffic.recording-updated",
        targetType: "event",
        targetId: eventId,
        result: "success",
        traceId: actor.traceId,
        metadata: data,
      },
      transaction,
    );
  });
  trafficRecorder.invalidate();
  return toDto(eventId);
}

interface GeoJsonFeatureCollection {
  type: "FeatureCollection";
  features: Array<{
    type: "Feature";
    geometry: { type: "Point"; coordinates: [number, number] };
    properties: { uid: string; type: string; callsign: string | null; time: string; stale: string; receivedAt: string };
  }>;
}

/**
 * The recorded traffic as GeoJSON, oldest first, at most 50,000 items. Exports contain personal
 * position data, so every export is audited.
 */
export async function exportTakTraffic(actor: ActorContext, eventId: string): Promise<GeoJsonFeatureCollection> {
  await requireEventPermission(actor.principal, eventId, "tak-traffic.view");
  const items = await database.takTrafficItem.findMany({
    where: { eventId },
    orderBy: { receivedAt: "asc" },
    take: EXPORT_LIMIT,
  });
  await recordAudit({
    actor: actor.principal,
    action: "tak-traffic.exported",
    targetType: "event",
    targetId: eventId,
    result: "success",
    traceId: actor.traceId,
    metadata: { items: items.length },
  });
  return {
    type: "FeatureCollection",
    features: items.map((item) => ({
      type: "Feature",
      geometry: { type: "Point", coordinates: [item.lon, item.lat] },
      properties: {
        uid: item.uid,
        type: item.type,
        callsign: item.callsign,
        time: item.time.toISOString(),
        stale: item.stale.toISOString(),
        receivedAt: item.receivedAt.toISOString(),
      },
    })),
  };
}
