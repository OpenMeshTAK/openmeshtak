import assert from "node:assert/strict";
import { after, beforeEach, describe, it } from "node:test";
import type { Express } from "express";
import request from "supertest";
import { createApp } from "../src/app.js";
import { disconnectDatabase } from "../src/shared/database/database.js";
import { clearDatabase, createServiceAccountKey, createUser, type TestUser } from "./support/identity.js";

let app: Express;
let admin: TestUser;

const custom = {
  providerName: "Example Tiles",
  tileUrlTemplate: "https://{a-c}.tiles.example.org/{z}/{x}/{y}.png",
  attribution: "© Example contributors",
  maxZoom: 18,
};

void describe("map settings", () => {
  beforeEach(async () => {
    await clearDatabase();
    app = createApp();
    admin = await createUser("Admin", [{ permission: "settings.manage" }]);
  });

  after(async () => {
    await clearDatabase();
    await disconnectDatabase();
  });

  void it("defaults to OpenStreetMap for every signed-in user", async () => {
    const participant = await createUser("Peter", []);
    const settings = (await request(app).get("/api/v1/map/settings").set("Cookie", participant.cookie).expect(200)).body as typeof custom & {
      version: number;
    };
    assert.equal(settings.providerName, "OpenStreetMap");
    assert.equal(settings.version, 0);
    const key = await createServiceAccountKey([]);
    await request(app).get("/api/v1/map/settings").set("Authorization", `Bearer ${key}`).expect(401);
  });

  void it("stores a provider with valid HTTPS tile templates only", async () => {
    const saved = (await request(app).put("/api/v1/map/settings").set("Cookie", admin.cookie).send({ version: 0, ...custom }).expect(200)).body as {
      providerName: string;
      version: number;
    };
    assert.deepEqual([saved.providerName, saved.version], ["Example Tiles", 1]);

    for (const tileUrlTemplate of ["http://tiles.example.org/{z}/{x}/{y}.png", "https://tiles.example.org/{z}/{x}.png", "javascript:alert(1)//{z}/{x}/{y}"]) {
      await request(app).put("/api/v1/map/settings").set("Cookie", admin.cookie).send({ version: 1, ...custom, tileUrlTemplate }).expect(422);
    }
    const participant = await createUser("Peter", []);
    await request(app).put("/api/v1/map/settings").set("Cookie", participant.cookie).send({ version: 1, ...custom }).expect(403);
  });
});
