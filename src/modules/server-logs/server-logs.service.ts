import { requirePermission } from "../../shared/auth/permission-check.js";
import type { Principal } from "../../shared/auth/principal.js";
import { recentLogs, type RecentLogBuffer, type RecentLogLine } from "../../shared/logging/recent-logs.js";
import type { ServerLogEntryDto, ServerLogLevel, ServerLogPage } from "./server-logs.dto.js";

/** Lines returned when the viewer opens; later polls return everything new up to this many. */
const PAGE_LIMIT = 500;

const LEVELS: Record<number, ServerLogLevel> = { 10: "trace", 20: "debug", 30: "info", 40: "warn", 50: "error", 60: "fatal" };

export function toServerLogEntry({ sequence, line }: RecentLogLine): ServerLogEntryDto {
  try {
    const { time, level, msg, ...rest } = JSON.parse(line) as Record<string, unknown>;
    return {
      sequence,
      time: typeof time === "string" ? time : null,
      level: (typeof level === "number" ? LEVELS[level] : undefined) ?? "info",
      message: typeof msg === "string" ? msg : "",
      details: Object.keys(rest).length === 0 ? null : JSON.stringify(rest),
    };
  } catch {
    // Core writes only JSON lines; anything else is shown as it was written.
    return { sequence, time: null, level: "info", message: line, details: null };
  }
}

/**
 * Core's own recent log lines for the live server log. Requires instance-wide `server-logs.read`.
 * Output of the container entrypoint and of migrations before Core starts is not included.
 */
export async function listServerLogs(
  principal: Principal,
  after: number | undefined,
  buffer: RecentLogBuffer = recentLogs,
): Promise<ServerLogPage> {
  await requirePermission(principal, "server-logs.read");
  // Sequences start again at 1 when Core restarts, so a cursor from before is ahead of the buffer.
  const reset = after === undefined || after > buffer.latestSequence();
  const lines = reset ? buffer.tail(PAGE_LIMIT) : buffer.after(after, PAGE_LIMIT);
  return { items: lines.map(toServerLogEntry), latestSequence: lines.at(-1)?.sequence ?? buffer.latestSequence(), reset };
}
