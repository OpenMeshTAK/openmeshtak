import assert from "node:assert/strict";
import { after, beforeEach, describe, it } from "node:test";
import type { Express } from "express";
import request from "supertest";
import { createApp } from "../src/app.js";
import { database, disconnectDatabase } from "../src/shared/database/database.js";
import { clearDatabase, createUser, type TestUser } from "./support/identity.js";

const PASSWORD = "A-registration-password-1!";

let app: Express;
let admin: TestUser;

async function setMode(mode: "closed" | "invite" | "open"): Promise<void> {
  const current = await request(app).get("/api/v1/registration-settings").set("Cookie", admin.cookie).expect(200);
  await request(app)
    .put("/api/v1/registration-settings")
    .set("Cookie", admin.cookie)
    .send({ version: (current.body as { version: number }).version, mode })
    .expect(200);
}

function register(body: Record<string, unknown>): request.Test {
  return request(app).post("/api/v1/registration").send({ displayName: "Anna", username: "anna", password: PASSWORD, ...body });
}

async function createInviteToken(): Promise<string> {
  const response = await request(app).post("/api/v1/registration-invites").set("Cookie", admin.cookie).expect(201);
  return new URL((response.body as { inviteUrl: string }).inviteUrl).hash.slice(1);
}

void describe("self-registration", () => {
  beforeEach(async () => {
    await clearDatabase();
    app = createApp();
    admin = await createUser("Admin", [{ permission: "users.manage" }]);
  });

  after(async () => {
    await clearDatabase();
    await disconnectDatabase();
  });

  void it("is closed by default", async () => {
    assert.deepEqual((await request(app).get("/api/v1/registration").expect(200)).body, { mode: "closed" });
    const closed = await register({}).expect(403);
    assert.equal((closed.body as { code: string }).code, "REGISTRATION_CLOSED");
  });

  void it("creates a signed-in account without permissions while open", async () => {
    await setMode("open");
    const created = await register({}).expect(201);
    const cookies = (created.headers["set-cookie"] as unknown as string[]).map((value) => value.split(";")[0]).join("; ");

    const principal = await request(app).get("/api/v1/principal").set("Cookie", cookies).expect(200);
    const body = principal.body as { username: string; hasPassword: boolean; permissions: unknown[] };
    assert.equal(body.username, "anna");
    assert.equal(body.hasPassword, true);
    assert.deepEqual(body.permissions, []);
    assert.equal(await database.auditEvent.count({ where: { action: "user.registered" } }), 1);

    const taken = await register({}).expect(409);
    assert.equal((taken.body as { code: string }).code, "USERNAME_TAKEN");
  });

  void it("needs a single-use invite while invite-only", async () => {
    await setMode("invite");
    const missing = await register({}).expect(401);
    assert.equal((missing.body as { code: string }).code, "INVALID_INVITE");

    const token = await createInviteToken();
    await register({ inviteToken: token }).expect(201);
    await register({ username: "bert", inviteToken: token }).expect(401);
    assert.equal(await database.user.count({ where: { username: "bert" } }), 0, "a failed sign-up leaves no account");
  });

  void it("refuses revoked invites", async () => {
    await setMode("invite");
    const token = await createInviteToken();
    const [invite] = (await request(app).get("/api/v1/registration-invites").set("Cookie", admin.cookie).expect(200)).body as { id: string }[];
    assert.ok(invite);
    const revoked = await request(app).post(`/api/v1/registration-invites/${invite.id}/revoke`).set("Cookie", admin.cookie).expect(200);
    assert.equal((revoked.body as { status: string }).status, "revoked");
    await register({ inviteToken: token }).expect(401);
  });

  void it("keeps the public sign-up endpoint of Better Auth blocked", async () => {
    await setMode("open");
    await request(app)
      .post("/api/auth/sign-up/email")
      .send({ email: "x@example.test", name: "X", password: PASSWORD })
      .expect(404);
  });
});
