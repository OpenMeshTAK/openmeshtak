import assert from "node:assert/strict";
import { after, beforeEach, describe, it } from "node:test";
import type { Express } from "express";
import request from "supertest";
import { createApp } from "../src/app.js";
import { database, disconnectDatabase } from "../src/shared/database/database.js";
import { clearDatabase, createUser, type TestUser } from "./support/identity.js";

interface CreatedUserBody {
  user: { id: string; displayName: string; username: string; passwordSet: boolean };
  setupLink: { url: string; expiresAt: string };
}

const NEW_PASSWORD = "A-fresh-first-password-789!";

let app: Express;
let admin: TestUser;

function tokenOf(url: string): string {
  return new URL(url).hash.slice(1);
}

function exchange(token: string): request.Test {
  return request(app).post("/api/v1/auth/setup-links/exchange").send({ token });
}

function sessionCookie(response: request.Response): string {
  const cookies = response.headers["set-cookie"] as unknown as string[];
  return cookies.map((value) => value.split(";")[0]).join("; ");
}

async function createPeter(): Promise<CreatedUserBody> {
  const response = await request(app)
    .post("/api/v1/users")
    .set("Cookie", admin.cookie)
    .send({ displayName: "Peter Müller" })
    .expect(201);
  return response.body as CreatedUserBody;
}

void describe("administrator-created users", () => {
  beforeEach(async () => {
    await clearDatabase();
    app = createApp();
    admin = await createUser("Admin", [{ permission: "users.manage" }, { permission: "users.read" }]);
  });

  after(async () => {
    await clearDatabase();
    await disconnectDatabase();
  });

  void it("creates a user without password and a setup link that signs them in once", async () => {
    const created = await createPeter();
    assert.equal(created.user.username, "peter.muller");
    assert.equal(created.user.passwordSet, false);
    assert.match(created.setupLink.url, /\/activate#omtk_setup_/);

    const exchanged = await exchange(tokenOf(created.setupLink.url)).expect(200);
    assert.equal(exchanged.headers["cache-control"], "no-store");
    const cookie = sessionCookie(exchanged);

    const principal = await request(app).get("/api/v1/principal").set("Cookie", cookie).expect(200);
    assert.equal((principal.body as { id: string; hasPassword: boolean }).id, created.user.id);
    assert.equal((principal.body as { hasPassword: boolean }).hasPassword, false);
    assert.deepEqual((principal.body as { permissions: unknown[] }).permissions, []);

    await request(app).post("/api/v1/me/account-setup").set("Cookie", cookie).send({ newPassword: NEW_PASSWORD }).expect(204);
    const listed = await request(app).get(`/api/v1/users/${created.user.id}`).set("Cookie", admin.cookie).expect(200);
    assert.equal((listed.body as { passwordSet: boolean }).passwordSet, true);

    const replay = await exchange(tokenOf(created.setupLink.url)).expect(401);
    assert.equal((replay.body as { code: string }).code, "INVALID_SETUP_LINK");
    assert.equal(await database.auditEvent.count({ where: { action: "user.created" } }), 1);
  });

  void it("rejects a taken username and needs users.manage", async () => {
    await request(app).post("/api/v1/users").set("Cookie", admin.cookie).send({ displayName: "Otto", username: "otto" }).expect(201);
    const taken = await request(app)
      .post("/api/v1/users")
      .set("Cookie", admin.cookie)
      .send({ displayName: "Again", username: "otto" })
      .expect(409);
    assert.equal((taken.body as { code: string }).code, "USERNAME_TAKEN");

    const reader = await createUser("Reader", [{ permission: "users.read" }]);
    await request(app).post("/api/v1/users").set("Cookie", reader.cookie).send({ displayName: "Nope" }).expect(403);
  });

  void it("replaces the setup link and refuses it for users who can already sign in", async () => {
    const created = await createPeter();
    const renewed = await request(app).post(`/api/v1/users/${created.user.id}/setup-link`).set("Cookie", admin.cookie).expect(201);
    await exchange(tokenOf(created.setupLink.url)).expect(401);

    const cookie = sessionCookie(await exchange(tokenOf((renewed.body as { url: string }).url)).expect(200));
    await request(app).post("/api/v1/me/account-setup").set("Cookie", cookie).send({ newPassword: NEW_PASSWORD }).expect(204);

    const refused = await request(app).post(`/api/v1/users/${created.user.id}/setup-link`).set("Cookie", admin.cookie).expect(409);
    assert.equal((refused.body as { code: string }).code, "ACCOUNT_ALREADY_SET_UP");
  });

  void it("does not sign in disabled users", async () => {
    const created = await createPeter();
    await request(app).post(`/api/v1/users/${created.user.id}/disable`).set("Cookie", admin.cookie).expect(200);
    await exchange(tokenOf(created.setupLink.url)).expect(401);
  });
});
