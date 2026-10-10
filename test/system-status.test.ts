import assert from "node:assert/strict";
import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, beforeEach, describe, it } from "node:test";
import type { Express } from "express";
import request from "supertest";
import { createApp } from "../src/app.js";
import { readCgroup } from "../src/modules/system-status/cgroup.js";
import { MetricHistory } from "../src/modules/system-status/system-metrics.js";
import { systemStatus } from "../src/modules/system-status/system-status.service.js";
import { disconnectDatabase } from "../src/shared/database/database.js";
import { ProblemLog } from "../src/shared/logging/problem-log.js";
import { clearDatabase, createUser } from "./support/identity.js";

interface SystemStatus {
  version: string;
  checks: Array<{ id: string; state: string; detail: string }>;
  databaseLatencyMs: number | null;
  databaseBytes: number | null;
  recentErrors: number;
}

let app: Express;

void describe("system status", () => {
  beforeEach(async () => {
    await clearDatabase();
    app = createApp();
  });

  after(async () => {
    await clearDatabase();
    await disconnectDatabase();
  });

  void it("shows operators the state of the database, the data disk and the TAK server", async () => {
    const operator = await createUser("Operator", [{ permission: "server-logs.read" }]);
    const status = (await request(app).get("/api/v1/system-status").set("Cookie", operator.cookie).expect(200)).body as SystemStatus;

    assert.match(status.version, /^\d+\.\d+\.\d+/);
    assert.ok(status.databaseLatencyMs !== null && status.databaseLatencyMs >= 0);
    assert.ok(status.databaseBytes !== null && status.databaseBytes > 0);
    assert.deepEqual(
      status.checks.map(({ id, state }) => [id, state]).filter(([id]) => id !== "storage" && id !== "errors"),
      [["database", "ok"], ["tak-server", "off"]],
    );
  });

  void it("is only for users who may read the server log", async () => {
    const member = await createUser("Member", []);
    await request(app).get("/api/v1/system-status").set("Cookie", member.cookie).expect(403);
    await request(app).get("/api/v1/system-status").expect(401);
  });

  void it("keeps warnings and errors on disk across restarts and counts those of the last 24 hours", async () => {
    const operator = await createUser("Operator", [{ permission: "server-logs.read" }]);
    const now = new Date("2026-10-10T12:00:00Z");
    const path = join(await mkdtemp(join(tmpdir(), "problem-log-")), "logs", "problems.jsonl");
    const written = new ProblemLog(path, 400);
    for (const line of [
      { time: "2026-10-01T08:00:00.000Z", level: 50, msg: "Older than a week" },
      { time: "2026-10-09T08:00:00.000Z", level: 50, msg: "Yesterday morning" },
      { time: "2026-10-10T09:00:00.000Z", level: 30, msg: "Fine" },
      { time: "2026-10-10T09:30:00.000Z", level: 40, msg: "Slow answer" },
      { time: "2026-10-10T10:00:00.000Z", level: 50, msg: "Mail failed" },
      { time: "2026-10-10T11:00:00.000Z", level: 60, msg: "Core crashed", event: "process_crashed" },
    ]) {
      written.write(`${JSON.stringify(line)}
`);
    }
    // A new process reads what the old one stored.
    const principal = { type: "user" as const, id: operator.id, authSubjectId: operator.authSubjectId, sessionCreatedAt: now };
    const status = await systemStatus(principal, new ProblemLog(path, 400), now);

    assert.equal(status.recentErrors, 2);
    assert.equal(status.recentWarnings, 1);
    assert.deepEqual(status.problems.map(({ message }) => message), ["Core crashed", "Mail failed", "Slow answer", "Yesterday morning"], "info is never stored");
    assert.equal(status.problems[0]?.details, JSON.stringify({ event: "process_crashed" }));
    assert.equal(status.checks.find(({ id }) => id === "errors")?.state, "warning");
  });

  void it("rolls the stored file over instead of growing without limit", async () => {
    const path = join(await mkdtemp(join(tmpdir(), "problem-log-")), "problems.jsonl");
    const log = new ProblemLog(path, 200);
    for (let index = 0; index < 20; index += 1) {
      log.write(`${JSON.stringify({ level: 50, msg: `Error ${String(index)}` })}
`);
    }
    const lines = log.read();
    assert.ok(lines.length < 20, "the oldest lines are gone");
    assert.match(lines.at(-1) ?? "", /Error 19/);
  });

  void it("records CPU, memory and TAK connections for the graphs", async () => {
    const operator = await createUser("Operator", [{ permission: "server-logs.read" }]);
    const metrics = new MetricHistory();
    const now = new Date("2026-10-10T12:00:00Z");
    for (let index = 0; index < 1000; index += 1) {
      metrics.sample(now);
    }
    const principal = { type: "user" as const, id: operator.id, authSubjectId: operator.authSubjectId, sessionCreatedAt: now };
    const status = await systemStatus(principal, new ProblemLog(join(tmpdir(), "missing", "problems.jsonl")), now, metrics);

    assert.equal(status.history.length, 720, "six hours of 30-second samples");
    const [sample] = status.history;
    assert.ok(sample !== undefined && sample.coreCpuPercent >= 0 && sample.coreCpuPercent <= 100);
    assert.ok(sample.systemMemoryUsedBytes > 0 && sample.systemMemoryUsedBytes <= sample.systemMemoryTotalBytes);
    assert.ok(sample.coreMemoryBytes > 0);
  });
});

void describe("container metrics", () => {
  void it("reads CPU and memory limits from cgroup v2 and v1 files", async () => {

    const v2 = await mkdtemp(join(tmpdir(), "cgroup-v2-"));
    await writeFile(join(v2, "cpu.stat"), "usage_usec 2500000\nuser_usec 2000000\n");
    await writeFile(join(v2, "cpu.max"), "150000 100000\n");
    await writeFile(join(v2, "memory.current"), "104857600\n");
    await writeFile(join(v2, "memory.max"), "max\n");
    assert.deepEqual(readCgroup(v2), { cpuUsageMicros: 2_500_000, cpuLimit: 1.5, memoryUsedBytes: 104_857_600, memoryLimitBytes: null });

    const v1 = await mkdtemp(join(tmpdir(), "cgroup-v1-"));
    for (const folder of ["cpuacct", "cpu", "memory"]) await mkdir(join(v1, folder));
    await writeFile(join(v1, "cpuacct/cpuacct.usage"), "3000000000\n");
    await writeFile(join(v1, "cpu/cpu.cfs_quota_us"), "-1\n");
    await writeFile(join(v1, "cpu/cpu.cfs_period_us"), "100000\n");
    await writeFile(join(v1, "memory/memory.usage_in_bytes"), "52428800\n");
    await writeFile(join(v1, "memory/memory.limit_in_bytes"), "9223372036854771712\n");
    assert.deepEqual(readCgroup(v1), { cpuUsageMicros: 3_000_000, cpuLimit: null, memoryUsedBytes: 52_428_800, memoryLimitBytes: null });

    assert.equal(readCgroup(join(v1, "missing")), null, "outside a container the machine values are used");
  });

  void it("reports container CPU against the container's CPU limit", () => {
    let usage = 0;
    const metrics = new MetricHistory(() => ({ cpuUsageMicros: usage, cpuLimit: 2, memoryUsedBytes: 1024, memoryLimitBytes: 4096 }));
    usage = 1e12;
    const sample = metrics.sample();

    assert.equal(metrics.scope(), "container");
    assert.equal(sample.systemCpuPercent, 100, "capped at the limit");
    assert.equal(sample.systemMemoryUsedBytes, 1024);
    assert.equal(sample.systemMemoryTotalBytes, 4096);
  });
});
