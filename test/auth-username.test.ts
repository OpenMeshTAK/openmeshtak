import assert from "node:assert/strict";
import { after, beforeEach, describe, it } from "node:test";
import type { Express } from "express";
import request from "supertest";
import { createApp } from "../src/app.js";
import { database, disconnectDatabase } from "../src/shared/database/database.js";
import { clearDatabase, createUser, type TestUser } from "./support/identity.js";

let app: Express;
let user: TestUser;

/** Usernames are TAK login names; Better Auth must neither reveal nor change them. */
void describe("Better Auth username endpoints", () => {
  beforeEach(async () => {
    await clearDatabase();
    app = createApp();
    user = await createUser("Peter", []);
  });

  after(async () => {
    await clearDatabase();
    await disconnectDatabase();
  });

  void it("does not offer a public username lookup", async () => {
    const { username } = await database.user.findUniqueOrThrow({ where: { id: user.authSubjectId } });

    await request(app).post("/api/auth/is-username-available").send({ username }).expect(404);
  });

  void it("does not let users change their username through Better Auth", async () => {
    const before = await database.user.findUniqueOrThrow({ where: { id: user.authSubjectId } });

    const response = await request(app)
      .post("/api/auth/update-user")
      .set("Cookie", user.cookie)
      .set("Origin", process.env.PUBLIC_ORIGIN ?? "http://localhost:5173")
      .send({ username: "someone-else" });

    assert.ok(response.status >= 400, `expected a rejection, got ${String(response.status)}`);
    const afterwards = await database.user.findUniqueOrThrow({ where: { id: user.authSubjectId } });
    assert.equal(afterwards.username, before.username);
  });
});
