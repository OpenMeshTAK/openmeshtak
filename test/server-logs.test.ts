import assert from "node:assert/strict";
import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import { after, beforeEach, describe, it } from "node:test";
import type { Express } from "express";
import { io, type Socket } from "socket.io-client";
import request from "supertest";
import { createApp } from "../src/app.js";
import { attachServerLogStream, SERVER_LOGS_NAMESPACE } from "../src/modules/server-logs/server-logs.realtime.js";
import { createRealtimeServer, REALTIME_PATH } from "../src/shared/realtime/realtime-server.js";
import { config } from "../src/shared/config/config.js";
import { disconnectDatabase } from "../src/shared/database/database.js";
import { createLogger } from "../src/shared/logging/logger.js";
import { RecentLogBuffer, recentLogDestination, recentLogs } from "../src/shared/logging/recent-logs.js";
import { clearDatabase, createApiClientKey, createUser, type TestUser } from "./support/identity.js";

interface ServerLogPage {
  items: Array<{ sequence: number; time: string | null; level: string; message: string; details: string | null }>;
  latestSequence: number;
  reset: boolean;
}

let app: Express;
let reader: TestUser;

// Tests run with LOG_LEVEL=silent, so this logger writes into the shared buffer directly. It uses
// the same sanitizer as the production logger.
const testLogger = createLogger(recentLogDestination(), "info");

async function readLogs(query = ""): Promise<ServerLogPage> {
  return (await request(app).get(`/api/v1/server-logs${query}`).set("Cookie", reader.cookie).expect(200)).body as ServerLogPage;
}

void describe("server log", () => {
  beforeEach(async () => {
    await clearDatabase();
    app = createApp();
    reader = await createUser("Operator", [{ permission: "server-logs.read" }]);
  });

  after(async () => {
    await clearDatabase();
    await disconnectDatabase();
  });

  void it("keeps only the newest lines and returns lines after a sequence", () => {
    const buffer = new RecentLogBuffer(3);
    buffer.add('{"msg":"one"}\n{"msg":"two"}\n');
    buffer.add('{"msg":"three"}\n{"msg":"four"}\n');
    assert.deepEqual(buffer.tail(10).map(({ sequence }) => sequence), [2, 3, 4]);
    assert.deepEqual(buffer.after(2, 10).map(({ line }) => line), ['{"msg":"three"}', '{"msg":"four"}']);
    assert.equal(buffer.latestSequence(), 4);
  });

  void it("shows sanitized lines and only new ones when polling", async () => {
    testLogger.warn({ event: "test_line", apiKey: "omtk_ak_public_secret", note: "token omtk_ak_key_inline" }, "Test warning");
    const first = await readLogs();
    assert.equal(first.reset, true);
    const line = first.items.at(-1);
    assert.equal(line?.message, "Test warning");
    assert.equal(line?.level, "warn");
    assert.ok(line?.details?.includes('"event":"test_line"'));
    assert.ok(!JSON.stringify(first).includes("omtk_ak_"));

    testLogger.info({ event: "next_line" }, "Next line");
    const next = await readLogs(`?after=${String(first.latestSequence)}`);
    assert.equal(next.reset, false);
    assert.deepEqual(
      next.items.map(({ message }) => message),
      ["Next line"],
    );

    const unchanged = await readLogs(`?after=${String(next.latestSequence)}`);
    assert.deepEqual([unchanged.items.length, unchanged.latestSequence], [0, next.latestSequence]);
  });

  void it("starts a fresh view when the cursor is ahead of the buffer after a restart", async () => {
    testLogger.info({ event: "after_restart" }, "After restart");
    const page = await readLogs(`?after=${String(recentLogs.latestSequence() + 1000)}`);
    assert.equal(page.reset, true);
    assert.equal(page.items.at(-1)?.message, "After restart");
  });

  void it("pushes new lines over the realtime socket to permitted viewers from the Web origin", async () => {
    const httpServer = createServer(app);
    const realtime = createRealtimeServer(httpServer);
    attachServerLogStream(realtime);
    await new Promise<void>((resolve) => httpServer.listen(0, "127.0.0.1", resolve));
    const { port } = httpServer.address() as AddressInfo;
    const connect = (cookie: string, origin = new URL(config.publicOrigin).origin): Socket =>
      io(`http://127.0.0.1:${String(port)}${SERVER_LOGS_NAMESPACE}`, {
        path: REALTIME_PATH,
        transports: ["websocket"],
        reconnection: false,
    // Each socket needs its own connection, otherwise they share the first one's cookie.
    forceNew: true,
        extraHeaders: { cookie, origin },
      });
    const outcome = (socket: Socket): Promise<string> =>
      new Promise((resolve) => {
        socket.on("connect", () => resolve("connected"));
        socket.on("connect_error", (error) => resolve(error.message));
      });

    try {
      const viewer = connect(reader.cookie);
      assert.equal(await outcome(viewer), "connected");
      const received = new Promise<{ message: string; details: string | null }>((resolve) => viewer.once("line", resolve));
      testLogger.error({ event: "pushed_line", password: "hunter2" }, "Pushed line");
      const line = await received;
      assert.equal(line.message, "Pushed line");
      assert.ok(line.details?.includes("[REDACTED]") === true && !line.details.includes("hunter2"));
      viewer.disconnect();

      const participant = await createUser("Peter", []);
      const denied = connect(participant.cookie);
      assert.equal(await outcome(denied), "Access denied");
      denied.disconnect();

      const foreign = connect(reader.cookie, "https://attacker.example");
      assert.notEqual(await outcome(foreign), "connected");
      foreign.disconnect();
    } finally {
      await realtime.close();
    }
  });

  void it("requires server-logs.read and a browser session", async () => {
    const participant = await createUser("Peter", []);
    await request(app).get("/api/v1/server-logs").set("Cookie", participant.cookie).expect(403);
    await request(app).get("/api/v1/server-logs").expect(401);
    const key = await createApiClientKey([{ permission: "server-logs.read" }]);
    await request(app).get("/api/v1/server-logs").set("Authorization", `Bearer ${key}`).expect(401);
    await request(app).get("/api/v1/server-logs?after=-1").set("Cookie", reader.cookie).expect(422);
    await request(app).get("/api/v1/server-logs?level=error").set("Cookie", reader.cookie).expect(422);
  });
});
