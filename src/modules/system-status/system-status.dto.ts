import type { ServerLogLevel } from "../server-logs/server-logs.dto.js";

/** `off` marks a part that is switched off on purpose, such as a disabled TAK server. */
export type SystemCheckState = "ok" | "warning" | "error" | "off";

export interface SystemCheckDto {
  id: "database" | "storage" | "tak-server" | "tak-certificate" | "errors";
  state: SystemCheckState;
  /** One plain sentence for operators; never contains secrets. */
  detail: string;
}

/** Whether system CPU and memory are the container's (cgroup) or the whole machine's. */
export type MetricScope = "container" | "host";

export interface MetricSampleDto {
  time: string;
  /** CPU used by the Core process, as a share of the CPUs it may use (0–100). */
  coreCpuPercent: number;
  /** CPU used by the container (against its CPU limit) or the machine, 0–100; see `scope`. */
  systemCpuPercent: number;
  /** Resident memory of the Core process. */
  coreMemoryBytes: number;
  /** Memory in use by the container or the machine; see `scope`. */
  systemMemoryUsedBytes: number;
  /** The container's memory limit (at most the machine's memory) or the machine's memory. */
  systemMemoryTotalBytes: number;
  takConnections: number;
}

/** A stored warning or error, sanitized like the server log. */
export interface LoggedProblemDto {
  time: string | null;
  level: ServerLogLevel;
  message: string;
  /** Structured fields as JSON, or null. */
  details: string | null;
}

export interface SystemStatusDto {
  /** Core release version. */
  version: string;
  startedAt: string;
  checks: SystemCheckDto[];
  /** Database round trip of a trivial query in milliseconds; null when it failed. */
  databaseLatencyMs: number | null;
  /** Size of the SQLite database file in bytes; null when unknown. */
  databaseBytes: number | null;
  /** Bytes of stored files (Data Package content, icon sets). */
  storedFileBytes: number;
  /** Free and total bytes on the disk that holds the data directory; null when unknown. */
  diskFreeBytes: number | null;
  diskTotalBytes: number | null;
  /** Resident memory of the Core process in bytes. */
  memoryBytes: number;
  /** Open TAK connections (streaming) right now. */
  takConnections: number;
  activeEvents: number;
  /** Errors (including fatal) logged in the last 24 hours, also before a restart. */
  recentErrors: number;
  recentWarnings: number;
  /** Stored warnings and errors of the last seven days, newest first, at most 100. */
  problems: LoggedProblemDto[];
  /** Seconds between two samples of `history`. */
  sampleIntervalSeconds: number;
  metricScope: MetricScope;
  /** CPU, memory and TAK connections of the last six hours since Core started, oldest first. */
  history: MetricSampleDto[];
}
