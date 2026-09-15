import assert from "node:assert/strict";
import { after, beforeEach, describe, it } from "node:test";
import type { Express } from "express";
import request from "supertest";
import { createApp } from "../src/app.js";
import { database, disconnectDatabase } from "../src/shared/database/database.js";
import { clearDatabase, createEvent, createUser, type TestUser } from "./support/identity.js";

interface PackageBody {
  id: string;
  name: string;
  version: number;
  latestRevision: number | null;
}

interface LayerBody {
  id: string;
  name: string;
  sortOrder: number;
  visible: boolean;
  locked: boolean;
  version: number;
}

let app: Express;
let editor: TestUser;
let eventId: string;

function packagesUrl(event = eventId): string {
  return `/api/v1/events/${event}/data-packages`;
}

async function createDataPackage(name = "Operation Phoenix"): Promise<PackageBody> {
  const response = await request(app).post(packagesUrl()).set("Cookie", editor.cookie).send({ name }).expect(201);
  return response.body as PackageBody;
}

async function listLayers(packageId: string): Promise<LayerBody[]> {
  const response = await request(app)
    .get(`${packagesUrl()}/${packageId}/layers`)
    .set("Cookie", editor.cookie)
    .expect(200);
  return (response.body as { items: LayerBody[] }).items;
}

void describe("dataPackages and layers", () => {
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

  void it("creates a data package with one empty layer and audits it", async () => {
    const dataPackage = await createDataPackage();
    assert.equal(dataPackage.latestRevision, null);

    const layers = await listLayers(dataPackage.id);
    assert.deepEqual(
      layers.map(({ name, sortOrder, visible, locked }) => ({ name, sortOrder, visible, locked })),
      [{ name: "Layer 1", sortOrder: 0, visible: true, locked: false }],
    );
    assert.equal(await database.auditEvent.count({ where: { action: "data-package.created", targetId: dataPackage.id } }), 1);
  });

  void it("updates dataPackages and layers with optimistic concurrency", async () => {
    const dataPackage = await createDataPackage();
    const renamed = await request(app)
      .put(`${packagesUrl()}/${dataPackage.id}`)
      .set("Cookie", editor.cookie)
      .send({ version: 1, name: "Phoenix", description: "Night exercise" })
      .expect(200);
    assert.equal((renamed.body as PackageBody).version, 2);
    await request(app)
      .put(`${packagesUrl()}/${dataPackage.id}`)
      .set("Cookie", editor.cookie)
      .send({ version: 1, name: "Stale", description: null })
      .expect(409);

    const added = await request(app)
      .post(`${packagesUrl()}/${dataPackage.id}/layers`)
      .set("Cookie", editor.cookie)
      .send({ name: "Routes" })
      .expect(201);
    const layer = added.body as LayerBody;
    assert.equal(layer.sortOrder, 1);

    const hidden = await request(app)
      .put(`${packagesUrl()}/${dataPackage.id}/layers/${layer.id}`)
      .set("Cookie", editor.cookie)
      .send({ version: 1, name: "Routes", sortOrder: 0, visible: false, locked: true })
      .expect(200);
    assert.deepEqual(
      { visible: (hidden.body as LayerBody).visible, locked: (hidden.body as LayerBody).locked },
      { visible: false, locked: true },
    );

    await request(app)
      .delete(`${packagesUrl()}/${dataPackage.id}/layers/${layer.id}`)
      .set("Cookie", editor.cookie)
      .expect(204);
    assert.equal((await listLayers(dataPackage.id)).length, 1);
  });

  void it("separates reading from editing and conceals other events", async () => {
    const dataPackage = await createDataPackage();
    const reader = await createUser("Reader", [{ permission: "data-packages.read", eventId }]);
    await request(app).get(`${packagesUrl()}/${dataPackage.id}`).set("Cookie", reader.cookie).expect(200);
    await request(app).post(packagesUrl()).set("Cookie", reader.cookie).send({ name: "Nope" }).expect(403);

    const otherEvent = await createEvent();
    const outsider = await createUser("Outsider", [{ permission: "data-packages.read", eventId: otherEvent }]);
    await request(app).get(`${packagesUrl()}/${dataPackage.id}`).set("Cookie", outsider.cookie).expect(404);
    await request(app)
      .get(`${packagesUrl(otherEvent)}/${dataPackage.id}`)
      .set("Cookie", outsider.cookie)
      .expect(404);
  });

  void it("keeps dataPackages of archived events read-only", async () => {
    const dataPackage = await createDataPackage();
    await database.event.update({ where: { id: eventId }, data: { status: "archived" } });

    await request(app).get(`${packagesUrl()}/${dataPackage.id}/layers`).set("Cookie", editor.cookie).expect(200);
    const response = await request(app)
      .post(`${packagesUrl()}/${dataPackage.id}/layers`)
      .set("Cookie", editor.cookie)
      .send({ name: "Late" })
      .expect(409);
    assert.equal((response.body as { code: string }).code, "EVENT_ARCHIVED");
  });

  void it("deletes a data package with its layers", async () => {
    const dataPackage = await createDataPackage();
    await request(app).delete(`${packagesUrl()}/${dataPackage.id}`).set("Cookie", editor.cookie).expect(204);
    assert.equal(await database.packageLayer.count(), 0);
    await request(app).get(`${packagesUrl()}/${dataPackage.id}`).set("Cookie", editor.cookie).expect(404);
  });
});
