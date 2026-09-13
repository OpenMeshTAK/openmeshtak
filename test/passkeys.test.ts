import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, beforeEach, describe, it } from "node:test";
import type { Express } from "express";
import request from "supertest";
import { createApp } from "../src/app.js";
import { database, disconnectDatabase } from "../src/shared/database/database.js";
import { clearDatabase, createUser, type TestUser } from "./support/identity.js";

let app: Express;
let user: TestUser;

async function storePasskey(authSubjectId: string): Promise<string> {
  const id = randomUUID();
  await database.passkey.create({
    data: {
      id,
      userId: authSubjectId,
      publicKey: "test-public-key",
      credentialID: `credential-${id}`,
      counter: 0,
      deviceType: "singleDevice",
      backedUp: false,
    },
  });
  return id;
}

void describe("passkeys", () => {
  beforeEach(async () => {
    await clearDatabase();
    app = createApp();
    user = await createUser("Admin", []);
  });

  after(async () => {
    await clearDatabase();
    await disconnectDatabase();
  });

  void it("offers registration options to a freshly signed-in user", async () => {
    const response = await request(app)
      .get("/api/auth/passkey/generate-register-options")
      .query({ name: "admin@example.test" })
      .set("Cookie", user.cookie)
      .expect(200);
    const options = response.body as { rp: { id: string }; user: { name: string } };
    assert.equal(options.rp.id, "localhost");
    assert.equal(options.user.name, "admin@example.test");
  });

  void it("requires a recent sign-in before registering a passkey", async () => {
    await database.session.updateMany({
      where: { userId: user.authSubjectId },
      data: { createdAt: new Date(Date.now() - 11 * 60 * 1000) },
    });

    await request(app)
      .get("/api/auth/passkey/generate-register-options")
      .set("Cookie", user.cookie)
      .expect(403);
  });

  void it("rejects registration without a session", async () => {
    await request(app).get("/api/auth/passkey/generate-register-options").expect(401);
  });

  void it("audits deleting an own passkey and protects other users' passkeys", async () => {
    const own = await storePasskey(user.authSubjectId);
    const other = await createUser("Other", []);
    const foreign = await storePasskey(other.authSubjectId);

    await request(app)
      .post("/api/auth/passkey/delete-passkey")
      .set("Cookie", user.cookie)
      .set("Origin", "http://localhost:3000")
      .send({ id: foreign })
      .expect((response) => {
        assert.notEqual(response.status, 200);
      });
    assert.ok(await database.passkey.findUnique({ where: { id: foreign } }));

    await request(app)
      .post("/api/auth/passkey/delete-passkey")
      .set("Cookie", user.cookie)
      .set("Origin", "http://localhost:3000")
      .send({ id: own })
      .expect(200);
    assert.equal(await database.passkey.findUnique({ where: { id: own } }), null);

    const audits = await database.auditEvent.findMany({ where: { action: "passkey.deleted" } });
    assert.deepEqual(
      audits.map(({ actorId, targetId }) => ({ actorId, targetId })),
      [{ actorId: user.id, targetId: own }],
    );
  });
});
