import { randomUUID } from "node:crypto";
import { database } from "../../shared/database/database.js";
import { logger } from "../../shared/logging/logger.js";
import type { LiveItem } from "./streaming/cot-router.js";
import type { CotScope } from "./streaming/cot-scope.js";

/** Which events record is re-read this often, so a changed setting applies within seconds. */
const SETTINGS_TTL_MS = 30_000;
/** Apps send their position every few seconds; one stored position per object and interval is enough. */
const POSITION_INTERVAL_MS = 5_000;
const DAY_MS = 86_400_000;

/** What the history needs beyond the live item to tell precise GPS fixes from estimates. */
export interface RecordedDetails {
  how: string | null;
  ce: number | null;
  /** The app's own position beacon rather than a marker it placed. */
  selfReported: boolean;
}

/**
 * Stores the TAK traffic of events that opted in. Writes happen in the background so the stream
 * never waits for the database, and failures are logged without the traffic itself.
 */
class TrafficRecorder {
  private recording = new Set<string>();
  private loadedAt = 0;
  private loading: Promise<void> | null = null;
  private readonly lastStored = new Map<string, number>();

  /** Forgets the cached settings, e.g. right after an administrator changed them. */
  invalidate(): void {
    this.loadedAt = 0;
  }

  record(userId: string, scope: CotScope, item: LiveItem, details: RecordedDetails): void {
    void this.recordNow(userId, scope, item, details).catch((error: unknown) => {
      logger.error({ error, event: "tak_traffic_record_failed" }, "TAK traffic could not be recorded");
    });
  }

  private async recordingEvents(): Promise<Set<string>> {
    if (Date.now() - this.loadedAt > SETTINGS_TTL_MS) {
      this.loading ??= database.takTrafficRecording
        .findMany({ where: { enabled: true, event: { status: "active" } }, select: { eventId: true } })
        .then((rows) => {
          this.recording = new Set(rows.map(({ eventId }) => eventId));
          this.loadedAt = Date.now();
        })
        .finally(() => {
          this.loading = null;
        });
      await this.loading;
    }
    return this.recording;
  }

  /** Positions (`a-…` atoms) are thinned out per object; markers and drawings are always kept. */
  private due(eventId: string, item: LiveItem, now: number): boolean {
    if (!item.type.startsWith("a-")) {
      return true;
    }
    const key = `${eventId}:${item.uid}`;
    if (now - (this.lastStored.get(key) ?? 0) < POSITION_INTERVAL_MS) {
      return false;
    }
    this.lastStored.set(key, now);
    return true;
  }

  private async recordNow(userId: string, scope: CotScope, item: LiveItem, details: RecordedDetails): Promise<void> {
    const recording = await this.recordingEvents();
    const now = Date.now();
    const eventIds = [...scope.keys()].filter((eventId) => recording.has(eventId) && this.due(eventId, item, now));
    if (eventIds.length === 0) {
      return;
    }
    await database.takTrafficItem.createMany({
      data: eventIds.map((eventId) => ({
        id: randomUUID(),
        eventId,
        uid: item.uid,
        type: item.type,
        callsign: item.callsign,
        lat: item.lat,
        lon: item.lon,
        time: item.time,
        stale: item.stale,
        how: details.how,
        ce: details.ce,
        selfReported: details.selfReported,
        userId,
      })),
    });
  }
}

export const trafficRecorder = new TrafficRecorder();

/** Deletes recorded items older than each event's retention period. */
export async function purgeExpiredTraffic(now = new Date()): Promise<number> {
  const settings = await database.takTrafficRecording.findMany({ select: { eventId: true, retentionDays: true } });
  let deleted = 0;
  for (const { eventId, retentionDays } of settings) {
    const result = await database.takTrafficItem.deleteMany({
      where: { eventId, receivedAt: { lt: new Date(now.getTime() - retentionDays * DAY_MS) } },
    });
    deleted += result.count;
  }
  return deleted;
}

/** Runs the cleanup at start and then every six hours in the Core server process. */
export function scheduleTrafficCleanup(): NodeJS.Timeout {
  const run = (): void => {
    purgeExpiredTraffic()
      .then((deleted) => {
        if (deleted > 0) {
          logger.info({ event: "tak_traffic_purged", deleted }, "Expired TAK traffic deleted");
        }
      })
      .catch((error: unknown) => {
        logger.error({ error, event: "tak_traffic_purge_failed" }, "Expired TAK traffic could not be deleted");
      });
  };
  run();
  return setInterval(run, 6 * 3_600_000).unref();
}
