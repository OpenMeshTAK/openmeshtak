import assert from "node:assert/strict";
import { after, beforeEach, describe, it } from "node:test";
import type { Express } from "express";
import request from "supertest";
import { createApp } from "../src/app.js";
import { config } from "../src/shared/config/config.js";
import { database, disconnectDatabase } from "../src/shared/database/database.js";
import { clearDatabase, createUser, type TestUser } from "./support/identity.js";

let app: Express;
let user: TestUser;

void describe("Better Auth HTTP routes", () => {
  beforeEach(async () => {
    await clearDatabase();
    app = createApp();
    user = await createUser("Peter", []);
  });

  after(async () => {
    await clearDatabase();
    await disconnectDatabase();
  });

  void it("routes nested sign-in, session reads and sign-out through Better Auth", async () => {
    const { email } = await database.user.findUniqueOrThrow({ where: { id: user.authSubjectId } });
    const signedIn = await request(app)
      .post("/api/auth/sign-in/email")
      .set("Origin", config.publicOrigin)
      .send({ email, password: "A-secure-test-password-123!" })
      .expect(200);
    const header = signedIn.headers["set-cookie"];
    assert.ok(header);
    const cookies = Array.isArray(header) ? header as string[] : [header];
    const cookie = cookies.map((value) => value.split(";")[0]).join("; ");
    assert.ok(cookie);

    const session = await request(app).get("/api/auth/get-session").set("Cookie", cookie).expect(200);
    assert.equal((session.body as { user: { id: string } }).user.id, user.authSubjectId);
    await request(app).get("/api/v1/principal").set("Cookie", cookie).expect(200);

    await request(app).post("/api/auth/sign-out").set("Origin", config.publicOrigin).set("Cookie", cookie).send({}).expect(200);
    await request(app).get("/api/v1/principal").set("Cookie", cookie).expect(401);
  });

  void it("keeps direct sign-up and username enumeration blocked", async () => {
    for (const path of ["/api/auth/sign-up/email", "/api/auth/is-username-available"]) {
      const response = await request(app).post(path).send({}).expect(404);
      assert.equal((response.body as { code: string }).code, "NOT_FOUND");
      assert.equal(response.headers["cache-control"], "no-store");
    }
  });
});
