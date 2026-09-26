import assert from "node:assert/strict";
import { after, afterEach, beforeEach, describe, it } from "node:test";
import type { Express } from "express";
import request from "supertest";
import { createApp } from "../src/app.js";
import { auth } from "../src/modules/auth/auth.js";
import { setEmailDeliveryForTests, type OutgoingEmail } from "../src/modules/email/mailer.js";
import { database, disconnectDatabase } from "../src/shared/database/database.js";
import { clearDatabase, createUser, type TestUser } from "./support/identity.js";

const PASSWORD = "A-secure-test-password-123!";
const NEW_PASSWORD = "An-even-better-password-456!";

let app: Express;
let admin: TestUser;
let peter: TestUser;
let email: string;
let outbox: OutgoingEmail[];

async function waitForEmail(predicate: (email: OutgoingEmail) => boolean): Promise<OutgoingEmail> {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    const found = outbox.find(predicate);
    if (found !== undefined) {
      return found;
    }
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
  throw new Error("expected email was not sent");
}

async function settle(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 150));
}

function linkIn(message: OutgoingEmail): string {
  const link = /https?:\/\/\S+/.exec(message.text)?.[0];
  assert.ok(link, "email contains a link");
  return link;
}

async function verifyAddress(): Promise<void> {
  await auth.api.sendVerificationEmail({ body: { email } });
  const message = await waitForEmail(({ subject }) => subject.startsWith("Confirm your email"));
  const token = new URL(linkIn(message)).searchParams.get("token") ?? "";
  await auth.api.verifyEmail({ query: { token } });
  outbox.length = 0;
}

void describe("account emails", () => {
  beforeEach(async () => {
    await clearDatabase();
    app = createApp();
    admin = await createUser("Admin", [{ permission: "users.manage" }]);
    peter = await createUser("Peter", []);
    email = (await database.user.findUniqueOrThrow({ where: { id: peter.authSubjectId } })).email;
    await database.emailSettings.create({
      data: { id: "email", enabled: true, host: "smtp.example.org", fromAddress: "noreply@example.org" },
    });
    outbox = [];
    setEmailDeliveryForTests((_settings, message) => {
      outbox.push(message);
      return Promise.resolve();
    });
  });

  afterEach(() => {
    setEmailDeliveryForTests(null);
  });

  after(async () => {
    await clearDatabase();
    await disconnectDatabase();
  });

  void it("sends reset links only to verified addresses, and every link works once", async () => {
    await auth.api.requestPasswordReset({ body: { email, redirectTo: "http://localhost:5173/reset-password" } });
    await auth.api.requestPasswordReset({ body: { email: "nobody@example.test", redirectTo: "http://localhost:5173/reset-password" } });
    await settle();
    assert.equal(outbox.length, 0, "unverified and unknown addresses get nothing");

    await verifyAddress();
    await auth.api.requestPasswordReset({ body: { email, redirectTo: "http://localhost:5173/reset-password" } });
    const message = await waitForEmail(({ subject }) => subject.startsWith("Reset your"));
    const token = new URL(linkIn(message)).pathname.split("/").pop() ?? "";

    await auth.api.resetPassword({ body: { newPassword: NEW_PASSWORD, token } });
    await request(app).get("/api/v1/principal").set("Cookie", peter.cookie).expect(401);
    assert.ok((await auth.api.signInEmail({ body: { email, password: NEW_PASSWORD } })).token);
    await assert.rejects(auth.api.resetPassword({ body: { newPassword: PASSWORD, token } }), "single use");
    await waitForEmail(({ subject }) => subject.includes("password was reset"));
  });

  void it("sends no reset email to disabled users and lets administrators trigger one", async () => {
    await verifyAddress();
    await request(app).post(`/api/v1/users/${peter.id}/disable`).set("Cookie", admin.cookie).expect(200);
    await request(app).post(`/api/v1/users/${peter.id}/password-reset`).set("Cookie", admin.cookie).expect(202);
    await settle();
    assert.equal(outbox.length, 0);

    await request(app).post(`/api/v1/users/${peter.id}/enable`).set("Cookie", admin.cookie).expect(200);
    await request(app).post(`/api/v1/users/${peter.id}/password-reset`).set("Cookie", admin.cookie).expect(202);
    const message = await waitForEmail(({ subject }) => subject.startsWith("Reset your"));
    assert.equal(message.to, email);
  });

  void it("verifies a new address before using it and tells the old address", async () => {
    await verifyAddress();
    await auth.api.changeEmail({ body: { newEmail: "peter.new@example.test" }, headers: new Headers({ cookie: peter.cookie }) });
    const verification = await waitForEmail(({ to }) => to === "peter.new@example.test");
    await waitForEmail(({ to, subject }) => to === email && subject.includes("being changed"));
    assert.equal((await database.user.findUniqueOrThrow({ where: { id: peter.authSubjectId } })).email, email, "not changed yet");

    const token = new URL(linkIn(verification)).searchParams.get("token") ?? "";
    await auth.api.verifyEmail({ query: { token } });
    const updated = await database.user.findUniqueOrThrow({ where: { id: peter.authSubjectId } });
    assert.deepEqual([updated.email, updated.emailVerified], ["peter.new@example.test", true]);
  });

  void it("notifies the verified address about a password change", async () => {
    await verifyAddress();
    await auth.api.changePassword({
      body: { currentPassword: PASSWORD, newPassword: NEW_PASSWORD, revokeOtherSessions: true },
      headers: new Headers({ cookie: peter.cookie }),
    });
    const notice = await waitForEmail(({ subject }) => subject.includes("password was changed"));
    assert.equal(notice.to, email);
    assert.equal(notice.text.includes(NEW_PASSWORD), false);
  });
});
