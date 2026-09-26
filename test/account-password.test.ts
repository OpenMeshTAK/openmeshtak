import assert from "node:assert/strict";
import { after, beforeEach, describe, it } from "node:test";
import type { Express } from "express";
import request from "supertest";
import { createApp } from "../src/app.js";
import { auth } from "../src/modules/auth/auth.js";
import { database, disconnectDatabase } from "../src/shared/database/database.js";
import { clearDatabase, createUser, type TestUser } from "./support/identity.js";

const OLD_PASSWORD = "A-secure-test-password-123!";
const NEW_PASSWORD = "An-even-better-password-456!";

let app: Express;
let user: TestUser;
let email: string;

function cookieHeaders(cookie: string): Headers {
  return new Headers({ cookie });
}

void describe("account password", () => {
  beforeEach(async () => {
    await clearDatabase();
    app = createApp();
    user = await createUser("Peter", []);
    email = (await database.user.findUniqueOrThrow({ where: { id: user.authSubjectId } })).email;
  });

  after(async () => {
    await clearDatabase();
    await disconnectDatabase();
  });

  void it("ends the other sessions when the password changes and accepts only the new password", async () => {
    const other = await auth.api.signInEmail({ body: { email, password: OLD_PASSWORD }, returnHeaders: true });
    const otherCookie = other.headers.getSetCookie().map((value) => value.split(";")[0]).join("; ");
    await request(app).get("/api/v1/principal").set("Cookie", otherCookie).expect(200);

    await auth.api.changePassword({
      body: { currentPassword: OLD_PASSWORD, newPassword: NEW_PASSWORD, revokeOtherSessions: true },
      headers: cookieHeaders(user.cookie),
    });

    await request(app).get("/api/v1/principal").set("Cookie", otherCookie).expect(401);
    await assert.rejects(auth.api.signInEmail({ body: { email, password: OLD_PASSWORD } }));
    assert.ok((await auth.api.signInEmail({ body: { email, password: NEW_PASSWORD } })).token);
  });
});
