import assert from "node:assert/strict";
import { after, beforeEach, describe, it } from "node:test";
import type { Express } from "express";
import request from "supertest";
import { createApp } from "../src/app.js";
import { auth } from "../src/modules/auth/auth.js";
import { database, disconnectDatabase } from "../src/shared/database/database.js";
import { clearDatabase, createUser, type TestUser } from "./support/identity.js";

const NEW_PASSWORD = "A-fresh-first-password-789!";

let app: Express;
let peter: TestUser;

/** Like a participant who signed in with an access link: a session, but no password. */
async function removePassword(user: TestUser): Promise<void> {
  await database.account.deleteMany({ where: { userId: user.authSubjectId, providerId: "credential" } });
}

async function principalOf(user: TestUser): Promise<{ hasPassword: boolean; username: string }> {
  return (await request(app).get("/api/v1/principal").set("Cookie", user.cookie).expect(200)).body as {
    hasPassword: boolean;
    username: string;
  };
}

void describe("first account password", () => {
  beforeEach(async () => {
    await clearDatabase();
    app = createApp();
    peter = await createUser("Peter", []);
    await removePassword(peter);
  });

  after(async () => {
    await clearDatabase();
    await disconnectDatabase();
  });

  void it("sets the first password, which then signs in with the username", async () => {
    assert.equal((await principalOf(peter)).hasPassword, false);

    await request(app).post("/api/v1/me/password").set("Cookie", peter.cookie).send({ newPassword: NEW_PASSWORD }).expect(204);

    const principal = await principalOf(peter);
    assert.equal(principal.hasPassword, true);
    assert.ok(await auth.api.signInUsername({ body: { username: principal.username, password: NEW_PASSWORD } }));
    assert.equal(await database.auditEvent.count({ where: { action: "password.set" } }), 1);
  });

  void it("never replaces an existing password", async () => {
    await request(app).post("/api/v1/me/password").set("Cookie", peter.cookie).send({ newPassword: NEW_PASSWORD }).expect(204);
    const again = await request(app)
      .post("/api/v1/me/password")
      .set("Cookie", peter.cookie)
      .send({ newPassword: "Another-password-to-try-1!" })
      .expect(409);
    assert.equal((again.body as { code: string }).code, "PASSWORD_ALREADY_SET");
  });

  void it("requires a recent sign-in and a long enough password", async () => {
    await request(app).post("/api/v1/me/password").set("Cookie", peter.cookie).send({ newPassword: "short" }).expect(422);

    await database.session.updateMany({
      where: { userId: peter.authSubjectId },
      data: { createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000) },
    });
    const stale = await request(app).post("/api/v1/me/password").set("Cookie", peter.cookie).send({ newPassword: NEW_PASSWORD }).expect(403);
    assert.equal((stale.body as { code: string }).code, "RECENT_AUTHENTICATION_REQUIRED");
  });
});
