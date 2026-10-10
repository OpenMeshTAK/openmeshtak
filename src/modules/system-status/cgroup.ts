import { readFileSync } from "node:fs";

/**
 * CPU and memory of the Linux control group Core runs in. Inside a Docker container `os.cpus()`
 * and `os.freemem()` describe the whole host, so the container's own usage and limits come from
 * the cgroup files instead: cgroup v2 first, then v1. Outside a container (or on Windows) these
 * files do not exist and callers fall back to the machine's values.
 */
export interface CgroupReading {
  /** Total CPU time used by the group, in microseconds. */
  cpuUsageMicros: number;
  /** CPUs the group may use, e.g. 1.5 for `--cpus 1.5`; null without a limit. */
  cpuLimit: number | null;
  memoryUsedBytes: number;
  /** Memory limit; null without a limit. */
  memoryLimitBytes: number | null;
}

const ROOT = "/sys/fs/cgroup";
/** cgroup v1 reports "no limit" as a huge number near 2^63. */
const NO_LIMIT = 2 ** 60;

function read(path: string): string | null {
  try {
    return readFileSync(path, "utf8").trim();
  } catch {
    return null;
  }
}

function number(value: string | null | undefined): number | null {
  if (value === null || value === undefined || value === "max") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed < NO_LIMIT ? parsed : null;
}

function readV2(root: string): CgroupReading | null {
  const stat = read(`${root}/cpu.stat`);
  const memory = number(read(`${root}/memory.current`));
  const usage = number(/^usage_usec (\d+)$/m.exec(stat ?? "")?.[1]);
  if (usage === null || memory === null) return null;
  const [quota, period] = (read(`${root}/cpu.max`) ?? "max").split(" ");
  const quotaValue = number(quota);
  const periodValue = number(period);
  return {
    cpuUsageMicros: usage,
    cpuLimit: quotaValue === null || periodValue === null || periodValue === 0 ? null : quotaValue / periodValue,
    memoryUsedBytes: memory,
    memoryLimitBytes: number(read(`${root}/memory.max`)),
  };
}

function readV1(root: string): CgroupReading | null {
  const usageNanos = number(read(`${root}/cpuacct/cpuacct.usage`));
  const memory = number(read(`${root}/memory/memory.usage_in_bytes`));
  if (usageNanos === null || memory === null) return null;
  const quota = number(read(`${root}/cpu/cpu.cfs_quota_us`));
  const period = number(read(`${root}/cpu/cpu.cfs_period_us`));
  return {
    cpuUsageMicros: usageNanos / 1000,
    cpuLimit: quota === null || quota <= 0 || period === null || period === 0 ? null : quota / period,
    memoryUsedBytes: memory,
    memoryLimitBytes: number(read(`${root}/memory/memory.limit_in_bytes`)),
  };
}

export function readCgroup(root = ROOT): CgroupReading | null {
  return readV2(root) ?? readV1(root);
}
