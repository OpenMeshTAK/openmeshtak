import assert from "node:assert/strict";
import { after, beforeEach, describe, it } from "node:test";
import type { Express } from "express";
import request from "supertest";
import { createApp } from "../src/app.js";
import { PERMISSIONS } from "../src/shared/auth/permissions.js";
import { disconnectDatabase } from "../src/shared/database/database.js";
import { clearDatabase, createApiClientKey, createUser, type TestUser } from "./support/identity.js";

const event = { name: "LightSim 2027", slug: "lightsim-2027", timeZone: "Europe/Berlin" };

let app: Express;
let admin: TestUser;

void describe("browser security", () => {
  beforeEach(async () => {
    await clearDatabase();
    app = createApp();
    admin = await createUser("Admin", PERMISSIONS.map((permission) => ({ permission })));
  });

  after(async () => {
    await clearDatabase();
    await disconnectDatabase();
  });

  void it("rejects cookie-authenticated changes sent from another origin", async () => {
    const response = await request(app)
      .post("/api/v1/events")
      .set("Cookie", admin.cookie)
      .set("Origin", "https://attacker.example")
      .send(event)
      .expect(403);
    assert.equal((response.body as { code: string }).code, "CROSS_SITE_REQUEST");
  });

  void it("rejects requests a browser marks as cross-site", async () => {
    await request(app)
      .post("/api/v1/events")
      .set("Cookie", admin.cookie)
      .set("Sec-Fetch-Site", "cross-site")
      .send(event)
      .expect(403);
  });

  void it("accepts changes from the public origin and reads from anywhere", async () => {
    await request(app)
      .post("/api/v1/events")
      .set("Cookie", admin.cookie)
      .set("Origin", "http://localhost:3000")
      .set("Sec-Fetch-Site", "same-origin")
      .send(event)
      .expect(201);
    await request(app)
      .get("/api/v1/events")
      .set("Cookie", admin.cookie)
      .set("Origin", "https://attacker.example")
      .expect(200);
  });

  void it("does not apply the origin check to API-key requests", async () => {
    const key = await createApiClientKey([{ permission: "events.manage" }]);
    await request(app)
      .post("/api/v1/events")
      .set("Authorization", `Bearer ${key}`)
      .set("Origin", "https://integration.example")
      .send(event)
      .expect(201);
  });

  void it("sends no CORS grants and forbids caching API responses", async () => {
    const preflight = await request(app)
      .options("/api/v1/events")
      .set("Origin", "https://attacker.example")
      .set("Access-Control-Request-Method", "POST");
    assert.equal(preflight.headers["access-control-allow-origin"], undefined);
    assert.equal(preflight.headers["access-control-allow-credentials"], undefined);

    const response = await request(app).get("/api/v1/principal").set("Cookie", admin.cookie).expect(200);
    assert.equal(response.headers["cache-control"], "no-store");
    assert.match(String(response.headers["content-security-policy"]), /default-src 'none'/);
    assert.equal(response.headers["x-content-type-options"], "nosniff");
  });
});
