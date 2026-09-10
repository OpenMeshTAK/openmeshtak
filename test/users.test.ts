import assert from "node:assert/strict";
import { after, beforeEach, describe, it } from "node:test";
import type { Express } from "express";
import request from "supertest";
import { createApp } from "../src/app.js";
import { disconnectDatabase } from "../src/shared/database/database.js";
import {
  clearDatabase,
  createEvent,
  createServiceAccountKey,
  createUser,
  type TestUser,
} from "./support/identity.js";

interface UserBody {
  id: string;
  displayName: string;
  email: string | null;
}

let app: Express;
let reader: TestUser;

void describe("users", () => {
  beforeEach(async () => {
    await clearDatabase();
    app = createApp();
    reader = await createUser("Reader", [{ permission: "users.read" }]);
  });

  after(async () => {
    await clearDatabase();
    await disconnectDatabase();
  });

  void it("lists and reads users for holders of users.read", async () => {
    const list = await request(app).get("/api/v1/users").set("Cookie", reader.cookie).expect(200);
    const items = (list.body as { items: UserBody[] }).items;
    assert.equal(items.length, 1);
    assert.equal(items[0]?.displayName, "Reader");
    assert.match(items[0]?.email ?? "", /@example\.test$/);

    await request(app).get(`/api/v1/users/${reader.id}`).set("Cookie", reader.cookie).expect(200);
  });

  void it("denies callers without users.read, including event-scoped grants", async () => {
    const other = await createUser("Other", [{ permission: "members.read", eventId: await createEvent() }]);
    await request(app).get("/api/v1/users").set("Cookie", other.cookie).expect(403);

    const key = await createServiceAccountKey([{ permission: "events.read" }]);
    await request(app).get("/api/v1/users").set("Authorization", `Bearer ${key}`).expect(403);
    await request(app).get("/api/v1/users").expect(401);
  });
});
