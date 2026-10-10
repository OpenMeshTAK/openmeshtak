import { statfs } from "node:fs/promises";
import { requirePermission } from "../../shared/auth/permission-check.js";
import type { Principal } from "../../shared/auth/principal.js";
import { config } from "../../shared/config/config.js";
import { database } from "../../shared/database/database.js";
import { RECENT_LOG_CAPACITY, recentLogs, type RecentLogBuffer } from "../../shared/logging/recent-logs.js";
import { coreVersion } from "../health/core-version.js";
import { toServerLogEntry } from "../server-logs/server-logs.service.js";
import { cotRouter } from "../tak-server/streaming/cot-router.js";
import { takListeners } from "../tak-server/tak-listeners.js";
import { loadTakServerSettings } from "../tak-server/tak-server-settings.js";
import { metricHistory, SAMPLE_INTERVAL_MS, type MetricHistory } from "./system-metrics.js";
import type { SystemCheckDto, SystemStatusDto } from "./system-status.dto.js";

const startedAt = new Date();
const DAY_MS = 24 * 60 * 60 * 1000;
/** Below either limit the disk is reported as running low. */
const LOW_DISK_BYTES = 1024 ** 3;
const LOW_DISK_SHARE = 0.1;
const CERTIFICATE_WARNING_DAYS = 30;

async function measureDatabase(): Promise<number | null> {
  const start = performance.now();
  try {
    await database.$queryRaw`SELECT 1`;
    return Math.round((performance.now() - start) * 10) / 10;
  } catch {
    return null;
  }
}

async function databaseSize(): Promise<number | null> {
  try {
    const [row] = await database.$queryRaw<Array<{ bytes: bigint | number }>>`SELECT page_count * page_size AS bytes FROM pragma_page_count(), pragma_page_size()`;
    return row === undefined ? null : Number(row.bytes);
  } catch {
    return null;
  }
}

async function disk(): Promise<{ free: number; total: number } | null> {
  try {
    const stats = await statfs(config.dataDirectory);
    return { free: stats.bavail * stats.bsize, total: stats.blocks * stats.bsize };
  } catch {
    return null;
  }
}

function formatBytes(bytes: number): string {
  return bytes >= 1024 ** 3 ? `${(bytes / 1024 ** 3).toFixed(1)} GB` : `${String(Math.round(bytes / 1024 ** 2))} MB`;
}

function diskCheck(space: { free: number; total: number } | null): SystemCheckDto {
  if (space === null) {
    return { id: "storage", state: "warning", detail: "The free space of the data directory could not be read." };
  }
  const low = space.free < LOW_DISK_BYTES || space.free < space.total * LOW_DISK_SHARE;
  return low
    ? { id: "storage", state: space.free < LOW_DISK_BYTES / 4 ? "error" : "warning", detail: `Only ${formatBytes(space.free)} free on the data disk.` }
    : { id: "storage", state: "ok", detail: `${formatBytes(space.free)} free on the data disk.` };
}

async function takChecks(now: Date): Promise<SystemCheckDto[]> {
  const settings = await loadTakServerSettings();
  if (!settings.enabled || settings.hostName === null) {
    return [{ id: "tak-server", state: "off", detail: "The TAK server is switched off." }];
  }
  const checks: SystemCheckDto[] = [
    takListeners.isListening()
      ? { id: "tak-server", state: "ok", detail: `Listening for TAK apps at ${settings.hostName}.` }
      : { id: "tak-server", state: "error", detail: "The TAK server is switched on but not listening. See the server log." },
  ];
  const certificate = await database.takServerCertificate.findUnique({ where: { activeSlot: "active" }, select: { notAfter: true } });
  if (certificate === null) {
    checks.push({ id: "tak-certificate", state: "error", detail: "The TAK server has no certificate yet." });
  } else {
    const days = Math.floor((certificate.notAfter.getTime() - now.getTime()) / DAY_MS);
    checks.push(
      days < 0
        ? { id: "tak-certificate", state: "error", detail: "The TAK server certificate has expired." }
        : days < CERTIFICATE_WARNING_DAYS
          ? { id: "tak-certificate", state: "warning", detail: `The TAK server certificate expires in ${String(days)} days.` }
          : { id: "tak-certificate", state: "ok", detail: `The TAK server certificate is valid for ${String(days)} more days.` },
    );
  }
  return checks;
}

/** Error and fatal lines among the recent log lines of the last 24 hours, newest last. */
function recentErrorLines(buffer: RecentLogBuffer, now: Date) {
  const since = now.getTime() - DAY_MS;
  return buffer
    .tail(RECENT_LOG_CAPACITY)
    .map(toServerLogEntry)
    .filter(({ level, time }) => (level === "error" || level === "fatal") && (time === null || Date.parse(time) >= since));
}

/**
 * A quick overview for operators: whether the database, the data disk, the TAK server and its
 * certificate are fine, plus a few numbers. Requires instance-wide `server-logs.read`, since it
 * summarizes the same server state the log shows.
 */
export async function systemStatus(
  principal: Principal,
  buffer: RecentLogBuffer = recentLogs,
  now = new Date(),
  metrics: MetricHistory = metricHistory,
): Promise<SystemStatusDto> {
  await requirePermission(principal, "server-logs.read");
  const [latency, databaseBytes, space, stored, activeEvents] = await Promise.all([
    measureDatabase(),
    databaseSize(),
    disk(),
    database.storageBlob.aggregate({ _sum: { size: true } }).catch(() => null),
    database.event.count({ where: { status: "active" } }).catch(() => 0),
  ]);
  const errors = recentErrorLines(buffer, now);
  const last = errors.at(-1);
  const checks: SystemCheckDto[] = [
    latency === null
      ? { id: "database", state: "error", detail: "The database does not answer." }
      : { id: "database", state: "ok", detail: `The database answers in ${String(latency)} ms.` },
    diskCheck(space),
    ...(latency === null ? [] : await takChecks(now)),
    errors.length === 0
      ? { id: "errors", state: "ok", detail: "No errors logged in the last 24 hours." }
      : { id: "errors", state: "warning", detail: `${String(errors.length)} error${errors.length === 1 ? "" : "s"} logged in the last 24 hours.` },
  ];
  return {
    version: coreVersion,
    startedAt: startedAt.toISOString(),
    checks,
    databaseLatencyMs: latency,
    databaseBytes,
    storedFileBytes: stored?._sum.size ?? 0,
    diskFreeBytes: space?.free ?? null,
    diskTotalBytes: space?.total ?? null,
    memoryBytes: process.memoryUsage.rss(),
    takConnections: cotRouter.size(),
    activeEvents,
    recentErrors: errors.length,
    lastError: last === undefined ? null : { time: last.time, message: last.message },
    sampleIntervalSeconds: SAMPLE_INTERVAL_MS / 1000,
    metricScope: metrics.scope(),
    history: metrics.history(),
  };
}
