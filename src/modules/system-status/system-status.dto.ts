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
  /** Error log lines among Core's recent log lines from the last 24 hours. */
  recentErrors: number;
  /** Time and message of the newest of those errors. */
  lastError: { time: string | null; message: string } | null;
  /** Seconds between two samples of `history`. */
  sampleIntervalSeconds: number;
  metricScope: MetricScope;
  /** CPU, memory and TAK connections of the last six hours since Core started, oldest first. */
  history: MetricSampleDto[];
}
