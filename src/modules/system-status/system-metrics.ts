import { availableParallelism, cpus, freemem, totalmem } from "node:os";
import { cotRouter } from "../tak-server/streaming/cot-router.js";
import { readCgroup, type CgroupReading } from "./cgroup.js";
import type { MetricSampleDto as MetricSample, MetricScope } from "./system-status.dto.js";

/** One sample every 30 seconds, kept for six hours, in memory only: a restart starts afresh. */
export const SAMPLE_INTERVAL_MS = 30_000;
const MAX_SAMPLES = (6 * 60 * 60 * 1000) / SAMPLE_INTERVAL_MS;

interface CpuReading {
  at: number;
  process: NodeJS.CpuUsage;
  /** The container's cgroup, when Core runs in one. */
  cgroup: CgroupReading | null;
  /** Host CPU times in milliseconds, used outside a container. */
  hostIdle: number;
  hostTotal: number;
}

function readCpu(readGroup: () => CgroupReading | null): CpuReading {
  let hostIdle = 0;
  let hostTotal = 0;
  for (const { times } of cpus()) {
    hostIdle += times.idle;
    hostTotal += times.user + times.nice + times.sys + times.idle + times.irq;
  }
  return { at: performance.now(), process: process.cpuUsage(), cgroup: readGroup(), hostIdle, hostTotal };
}

function percent(value: number): number {
  return Math.round(Math.min(100, Math.max(0, value)) * 10) / 10;
}

/**
 * Keeps a short history of CPU, memory and TAK connections for the system status graphs. Each
 * sample measures the CPU used since the previous one. In a container the "system" values are
 * the container's, measured against its CPU and memory limits; otherwise they are the machine's.
 */
export class MetricHistory {
  private readonly samples: MetricSample[] = [];
  private last: CpuReading;
  private timer: NodeJS.Timeout | null = null;

  constructor(private readonly readGroup: () => CgroupReading | null = readCgroup) {
    this.last = readCpu(readGroup);
  }

  /** Whether the values describe the container Core runs in or the whole machine. */
  scope(): MetricScope {
    return this.last.cgroup === null ? "host" : "container";
  }

  start(): void {
    this.timer ??= setInterval(() => this.sample(), SAMPLE_INTERVAL_MS).unref();
  }

  stop(): void {
    if (this.timer !== null) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  sample(now = new Date()): MetricSample {
    const previous = this.last;
    const current = readCpu(this.readGroup);
    this.last = current;
    const elapsedMicros = (current.at - previous.at) * 1000;
    const group = current.cgroup;
    // CPUs Core may use: the container's limit, else every CPU available to the process.
    const cores = Math.max(0.01, group?.cpuLimit ?? availableParallelism());
    const share = (usedMicros: number): number => (elapsedMicros > 0 ? percent((usedMicros / elapsedMicros / cores) * 100) : 0);

    const coreMicros = current.process.user - previous.process.user + (current.process.system - previous.process.system);
    let systemCpuPercent: number;
    let used: number;
    let total: number;
    if (group !== null && previous.cgroup !== null) {
      systemCpuPercent = share(group.cpuUsageMicros - previous.cgroup.cpuUsageMicros);
      used = group.memoryUsedBytes;
      // Without a memory limit the container may use the whole machine.
      total = Math.min(group.memoryLimitBytes ?? totalmem(), totalmem());
    } else {
      const hostTotal = current.hostTotal - previous.hostTotal;
      systemCpuPercent = hostTotal > 0 ? percent(((hostTotal - (current.hostIdle - previous.hostIdle)) / hostTotal) * 100) : 0;
      used = totalmem() - freemem();
      total = totalmem();
    }

    const sample: MetricSample = {
      time: now.toISOString(),
      coreCpuPercent: share(coreMicros),
      systemCpuPercent,
      coreMemoryBytes: process.memoryUsage.rss(),
      systemMemoryUsedBytes: used,
      systemMemoryTotalBytes: total,
      takConnections: cotRouter.size(),
    };
    this.samples.push(sample);
    if (this.samples.length > MAX_SAMPLES) {
      this.samples.shift();
    }
    return sample;
  }

  history(): MetricSample[] {
    return [...this.samples];
  }
}

export const metricHistory = new MetricHistory();
