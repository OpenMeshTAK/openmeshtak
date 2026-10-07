import assert from "node:assert/strict";
import { after, beforeEach, describe, it } from "node:test";
import type { Express } from "express";
import request from "supertest";
import { createApp } from "../src/app.js";
import { auth } from "../src/modules/auth/auth.js";
import { backfillUsernames, usernameBaseFrom } from "../src/modules/users/usernames.js";
import { database, disconnectDatabase } from "../src/shared/database/database.js";
import { clearDatabase, createUser, type TestUser } from "./support/identity.js";

const PASSWORD = "A-secure-test-password-123!";

let app: Express;
let admin: TestUser;
let peter: TestUser;

void describe("account usernames", () => {
  beforeEach(async () => {
    await clearDatabase();
    app = createApp();
    admin = await createUser("Admin", [{ permission: "users.read" }, { permission: "users.create" }, { permission: "users.edit" }, { permission: "users.set-email" }, { permission: "users.disable" }, { permission: "users.sign-out" }, { permission: "users.password-reset" }, { permission: "users.setup-links" }]);
    peter = await createUser("Peter Müller", []);
  });

  after(async () => {
    await clearDatabase();
    await disconnectDatabase();
  });

  void it("derives typeable usernames from display names", () => {
    assert.equal(usernameBaseFrom("Peter Müller"), "peter.muller");
    assert.equal(usernameBaseFrom("DruckluftDieter [Bravo]"), "druckluftdieter.bravo");
    assert.equal(usernameBaseFrom("Al"), "useral");
    assert.equal(usernameBaseFrom("🙂"), "user");
  });

  void it("gives every account a unique username and backfills old accounts", async () => {
    const second = await createUser("Peter Müller", []);
    const usernames = await database.user.findMany({
      where: { id: { in: [peter.authSubjectId, second.authSubjectId] } },
      select: { username: true },
    });
    assert.deepEqual(usernames.map(({ username }) => username).sort(), ["peter.muller", "peter.muller2"]);

    await database.user.update({ where: { id: second.authSubjectId }, data: { username: null } });
    await backfillUsernames();
    const backfilled = await database.user.findUniqueOrThrow({ where: { id: second.authSubjectId } });
    assert.equal(backfilled.username, "peter.muller2");
  });

  void it("signs in with the username in any letter case", async () => {
    const signedIn = await auth.api.signInUsername({ body: { username: "Peter.Muller", password: PASSWORD } });
    assert.ok(signedIn?.token);
    await assert.rejects(auth.api.signInUsername({ body: { username: "peter.muller", password: "wrong-password-123!" } }));
  });

  void it("lets administrators change a username and rejects taken or invalid ones", async () => {
    const changed = await request(app)
      .put(`/api/v1/users/${peter.id}`)
      .set("Cookie", admin.cookie)
      .send({ version: 1, displayName: "Peter Müller", username: "peter" })
      .expect(200);
    assert.equal((changed.body as { username: string }).username, "peter");
    assert.ok(await auth.api.signInUsername({ body: { username: "peter", password: PASSWORD } }));

    await request(app)
      .put(`/api/v1/users/${peter.id}`)
      .set("Cookie", admin.cookie)
      .send({ version: 2, displayName: "Peter Müller", username: "admin" })
      .expect(409);
    await request(app)
      .put(`/api/v1/users/${peter.id}`)
      .set("Cookie", admin.cookie)
      .send({ version: 2, displayName: "Peter Müller", username: "Not Valid!" })
      .expect(422);
  });

  void it("shows the username in the principal", async () => {
    const principal = await request(app).get("/api/v1/principal").set("Cookie", peter.cookie).expect(200);
    assert.equal((principal.body as { username: string }).username, "peter.muller");
  });
});
