import assert from "node:assert/strict";
import { after, beforeEach, describe, it } from "node:test";
import type { Express } from "express";
import request from "supertest";
import { createApp } from "../src/app.js";
import { auth } from "../src/modules/auth/auth.js";
import { takAccessFor } from "../src/modules/tak-server/tak-access.js";
import { database, disconnectDatabase } from "../src/shared/database/database.js";
import { clearDatabase, createUser, type TestUser } from "./support/identity.js";

interface UserBody {
  id: string;
  displayName: string;
  disabled: boolean;
  version: number;
}

let app: Express;
let admin: TestUser;
let peter: TestUser;

async function emailOf(user: TestUser): Promise<string> {
  return (await database.user.findUniqueOrThrow({ where: { id: user.authSubjectId } })).email;
}

void describe("user administration", () => {
  beforeEach(async () => {
    await clearDatabase();
    app = createApp();
    admin = await createUser("Admin", [{ permission: "users.read" }, { permission: "users.manage" }, { permission: "tak-server.admin-access" }]);
    peter = await createUser("Peter Parker", [{ permission: "tak-server.admin-access" }]);
  });

  after(async () => {
    await clearDatabase();
    await disconnectDatabase();
  });

  void it("searches users by name and email and renames them", async () => {
    const found = await request(app).get("/api/v1/users?search=parker").set("Cookie", admin.cookie).expect(200);
    assert.deepEqual((found.body as { items: UserBody[] }).items.map(({ displayName }) => displayName), ["Peter Parker"]);

    const byEmail = await request(app)
      .get(`/api/v1/users?search=${encodeURIComponent((await emailOf(peter)).slice(0, 12))}`)
      .set("Cookie", admin.cookie)
      .expect(200);
    assert.equal((byEmail.body as { items: UserBody[] }).items[0]?.id, peter.id);

    const renamed = (await request(app).put(`/api/v1/users/${peter.id}`).set("Cookie", admin.cookie).send({ version: 1, displayName: "Spider" }).expect(200))
      .body as UserBody;
    assert.deepEqual([renamed.displayName, renamed.version], ["Spider", 2]);
    await request(app).put(`/api/v1/users/${peter.id}`).set("Cookie", admin.cookie).send({ version: 1, displayName: "Again" }).expect(409);
  });

  void it("disables a user everywhere and enables them again", async () => {
    const disabled = (await request(app).post(`/api/v1/users/${peter.id}/disable`).set("Cookie", admin.cookie).expect(200)).body as UserBody;
    assert.equal(disabled.disabled, true);

    await request(app).get("/api/v1/principal").set("Cookie", peter.cookie).expect(401);
    assert.equal(await database.session.count({ where: { userId: peter.authSubjectId } }), 0);
    await assert.rejects(auth.api.signInEmail({ body: { email: await emailOf(peter), password: "A-secure-test-password-123!" } }));
    assert.deepEqual(await takAccessFor(peter.id), { admin: false, eventIds: [] });

    await request(app).post(`/api/v1/users/${peter.id}/enable`).set("Cookie", admin.cookie).expect(200);
    const signedIn = await auth.api.signInEmail({ body: { email: await emailOf(peter), password: "A-secure-test-password-123!" } });
    assert.ok(signedIn.token);
    assert.equal(await database.auditEvent.count({ where: { action: { in: ["user.disabled", "user.enabled"] } } }), 2);
  });

  void it("never lets administrators disable themselves and signs users out everywhere", async () => {
    await request(app).post(`/api/v1/users/${admin.id}/disable`).set("Cookie", admin.cookie).expect(409);
    await request(app).post(`/api/v1/users/${peter.id}/revoke-sessions`).set("Cookie", admin.cookie).expect(204);
    await request(app).get("/api/v1/principal").set("Cookie", peter.cookie).expect(401);
    await request(app).post(`/api/v1/users/${admin.id}/disable`).set("Cookie", peter.cookie).expect(401);
  });
});
