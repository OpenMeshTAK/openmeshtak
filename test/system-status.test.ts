import assert from "node:assert/strict";
import { after, beforeEach, describe, it } from "node:test";
import type { Express } from "express";
import request from "supertest";
import { createApp } from "../src/app.js";
import { systemStatus } from "../src/modules/system-status/system-status.service.js";
import { disconnectDatabase } from "../src/shared/database/database.js";
import { RecentLogBuffer } from "../src/shared/logging/recent-logs.js";
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

  void it("counts the errors of the last 24 hours and reports the newest", async () => {
    const operator = await createUser("Operator", [{ permission: "server-logs.read" }]);
    const now = new Date("2026-10-10T12:00:00Z");
    const buffer = new RecentLogBuffer(10);
    buffer.add(
      [
        { time: "2026-10-09T08:00:00.000Z", level: 50, msg: "Too old" },
        { time: "2026-10-10T09:00:00.000Z", level: 30, msg: "Fine" },
        { time: "2026-10-10T10:00:00.000Z", level: 50, msg: "Mail failed" },
        { time: "2026-10-10T11:00:00.000Z", level: 60, msg: "Listener crashed" },
      ]
        .map((line) => JSON.stringify(line))
        .join("\n") + "\n",
    );
    const principal = { type: "user" as const, id: operator.id, authSubjectId: operator.authSubjectId, sessionCreatedAt: now };
    const status = await systemStatus(principal, buffer, now);

    assert.equal(status.recentErrors, 2);
    assert.deepEqual(status.lastError, { time: "2026-10-10T11:00:00.000Z", message: "Listener crashed" });
    assert.equal(status.checks.find(({ id }) => id === "errors")?.state, "warning");
  });
});
