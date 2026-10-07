import assert from "node:assert/strict";
import { after, beforeEach, describe, it } from "node:test";
import type { Express } from "express";
import request from "supertest";
import { createApp } from "../src/app.js";
import { disconnectDatabase } from "../src/shared/database/database.js";
import { clearDatabase, createUser, type TestUser } from "./support/identity.js";

let app: Express;
let admin: TestUser;

void describe("instance settings", () => {
  beforeEach(async () => {
    await clearDatabase();
    app = createApp();
    admin = await createUser("Admin", [{ permission: "settings.manage" }]);
  });

  after(async () => {
    await clearDatabase();
    await disconnectDatabase();
  });

  void it("shows the default name without a session", async () => {
    const settings = (await request(app).get("/api/v1/instance").expect(200)).body as { name: string; version: number };
    assert.deepEqual(settings, { name: "OpenMeshTak", version: 0 });
  });

  void it("lets settings managers rename the installation", async () => {
    const saved = (await request(app).put("/api/v1/instance").set("Cookie", admin.cookie).send({ version: 0, name: "  Field\nExercise  2026 " }).expect(200))
      .body as { name: string; version: number };
    assert.deepEqual(saved, { name: "Field Exercise 2026", version: 1 });
    assert.equal(((await request(app).get("/api/v1/instance").expect(200)).body as { name: string }).name, "Field Exercise 2026");

    await request(app).put("/api/v1/instance").set("Cookie", admin.cookie).send({ version: 0, name: "Stale" }).expect(409);
    await request(app).put("/api/v1/instance").set("Cookie", admin.cookie).send({ version: 1, name: "   " }).expect(422);
    const participant = await createUser("Peter", []);
    await request(app).put("/api/v1/instance").set("Cookie", participant.cookie).send({ version: 1, name: "Mine" }).expect(403);
    await request(app).put("/api/v1/instance").send({ version: 1, name: "Anonymous" }).expect(401);
  });
});
