import assert from "node:assert/strict";
import { after, afterEach, beforeEach, describe, it } from "node:test";
import type { Express } from "express";
import request from "supertest";
import { createApp } from "../src/app.js";
import { setEmailDeliveryForTests, type OutgoingEmail } from "../src/modules/email/mailer.js";
import { database, disconnectDatabase } from "../src/shared/database/database.js";
import { clearDatabase, createUser, type TestUser } from "./support/identity.js";

const SMTP_PASSWORD = "smtp-secret-value";

let app: Express;
let admin: TestUser;
let outbox: Array<OutgoingEmail & { host: string | null }>;

const settings = {
  enabled: true,
  host: "smtp.example.org",
  port: 587,
  security: "starttls",
  username: "mailer",
  fromAddress: "noreply@example.org",
  fromName: "OpenMeshTak",
};

void describe("email settings", () => {
  beforeEach(async () => {
    await clearDatabase();
    app = createApp();
    admin = await createUser("Admin", [{ permission: "email.manage" }]);
    outbox = [];
    setEmailDeliveryForTests((stored, email) => {
      outbox.push({ ...email, host: stored.host });
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

  void it("stores the SMTP password write-only and encrypted", async () => {
    const saved = await request(app).put("/api/v1/email/settings").set("Cookie", admin.cookie).send({ version: 0, ...settings, password: SMTP_PASSWORD }).expect(200);
    assert.equal((saved.body as { passwordSet: boolean }).passwordSet, true);
    assert.equal(JSON.stringify(saved.body).includes(SMTP_PASSWORD), false);

    const row = await database.emailSettings.findUniqueOrThrow({ where: { id: "email" } });
    assert.equal(JSON.stringify(row).includes(SMTP_PASSWORD), false);
    const audits = JSON.stringify(await database.auditEvent.findMany());
    assert.equal(audits.includes(SMTP_PASSWORD), false);

    const kept = await request(app).put("/api/v1/email/settings").set("Cookie", admin.cookie).send({ version: 1, ...settings, port: 465, security: "tls" }).expect(200);
    assert.equal((kept.body as { passwordSet: boolean }).passwordSet, true, "omitted password is kept");
    const cleared = await request(app).put("/api/v1/email/settings").set("Cookie", admin.cookie).send({ version: 2, ...settings, password: null }).expect(200);
    assert.equal((cleared.body as { passwordSet: boolean }).passwordSet, false);
  });

  void it("sends a test email only when delivery is configured", async () => {
    await request(app).post("/api/v1/email/settings/test").set("Cookie", admin.cookie).send({ to: "admin@example.org" }).expect(502);
    await request(app).put("/api/v1/email/settings").set("Cookie", admin.cookie).send({ version: 0, ...settings }).expect(200);
    await request(app).post("/api/v1/email/settings/test").set("Cookie", admin.cookie).send({ to: "admin@example.org" }).expect(204);
    assert.deepEqual(outbox.map(({ to, host }) => [to, host]), [["admin@example.org", "smtp.example.org"]]);
  });

  void it("requires a host and sender to enable delivery and email.manage to change anything", async () => {
    await request(app).put("/api/v1/email/settings").set("Cookie", admin.cookie).send({ version: 0, ...settings, host: null }).expect(422);
    const other = await createUser("Editor", [{ permission: "users.manage" }]);
    await request(app).get("/api/v1/email/settings").set("Cookie", other.cookie).expect(403);
  });
});
