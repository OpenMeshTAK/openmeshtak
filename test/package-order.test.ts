import assert from "node:assert/strict";
import { after, beforeEach, describe, it } from "node:test";
import type { Express } from "express";
import request from "supertest";
import { createApp } from "../src/app.js";
import { database, disconnectDatabase } from "../src/shared/database/database.js";
import { clearDatabase, createEvent, createUser, type TestUser } from "./support/identity.js";

let app: Express;
let editor: TestUser;
let eventId: string;

async function createPackage(name: string): Promise<{ id: string; sortOrder: number; version: number }> {
  const response = await request(app).post(`/api/v1/events/${eventId}/data-packages`).set("Cookie", editor.cookie).send({ name }).expect(201);
  return response.body as { id: string; sortOrder: number; version: number };
}

function reorder(packageIds: string[]): request.Test {
  return request(app).put(`/api/v1/events/${eventId}/data-package-order`).set("Cookie", editor.cookie).send({ packageIds });
}

void describe("data package order", () => {
  beforeEach(async () => {
    await clearDatabase();
    app = createApp();
    eventId = await createEvent();
    editor = await createUser("Editor", [
      { permission: "data-packages.read", eventId },
      { permission: "data-packages.edit", eventId },
    ]);
  });

  after(async () => {
    await clearDatabase();
    await disconnectDatabase();
  });

  void it("puts new packages on top and stores a complete new order", async () => {
    const base = await createPackage("Base map");
    const overlay = await createPackage("Overlay");
    assert.deepEqual([base.sortOrder, overlay.sortOrder], [0, 1]);

    const reordered = (await reorder([overlay.id, base.id]).expect(200)).body as Array<{ id: string; sortOrder: number }>;
    assert.deepEqual(
      reordered.sort((a, b) => a.sortOrder - b.sortOrder).map(({ id }) => id),
      [overlay.id, base.id],
    );
    const unchanged = await database.dataPackage.findUniqueOrThrow({ where: { id: base.id } });
    assert.equal(unchanged.version, base.version, "reordering never conflicts with content edits");
  });

  void it("refuses an order that misses, repeats or adds packages", async () => {
    const base = await createPackage("Base map");
    const overlay = await createPackage("Overlay");
    for (const ids of [[base.id], [base.id, base.id], [base.id, overlay.id, crypto.randomUUID()]]) {
      const response = await reorder(ids).expect(409);
      assert.equal((response.body as { code: string }).code, "STALE_PACKAGE_ORDER");
    }
    const reader = await createUser("Reader", [{ permission: "data-packages.read", eventId }]);
    await request(app)
      .put(`/api/v1/events/${eventId}/data-package-order`)
      .set("Cookie", reader.cookie)
      .send({ packageIds: [overlay.id, base.id] })
      .expect(403);
  });
});
