import assert from "node:assert/strict";
import { after, beforeEach, describe, it } from "node:test";
import type { Express } from "express";
import request from "supertest";
import { createApp } from "../src/app.js";
import { PERMISSIONS } from "../src/shared/auth/permissions.js";
import { database, disconnectDatabase } from "../src/shared/database/database.js";
import { clearDatabase, createEvent, createUser, type TestUser } from "./support/identity.js";

let app: Express;
let admin: TestUser;
let eventId: string;

interface SourcePackage {
  id: string;
  firstLayerId: string;
  secondLayerId: string;
  firstObjectId: string;
}

async function createPublishedSource(): Promise<SourcePackage> {
  const created = await request(app)
    .post(`/api/v1/events/${eventId}/data-packages`)
    .set("Cookie", admin.cookie)
    .send({ name: "Source package" })
    .expect(201);
  const id = (created.body as { id: string }).id;
  const baseUrl = `/api/v1/events/${eventId}/data-packages/${id}`;
  const layers = await request(app).get(`${baseUrl}/layers`).set("Cookie", admin.cookie).expect(200);
  const firstLayerId = (layers.body as { items: Array<{ id: string }> }).items[0]?.id ?? "";
  const secondLayer = await request(app)
    .post(`${baseUrl}/layers`)
    .set("Cookie", admin.cookie)
    .send({ name: "Second layer" })
    .expect(201);
  const secondLayerId = (secondLayer.body as { id: string }).id;

  const firstObject = await request(app)
    .post(`${baseUrl}/objects`)
    .set("Cookie", admin.cookie)
    .send({ layerId: firstLayerId, name: "Rally", geometry: { type: "Point", coordinates: [8.68, 50.11] } })
    .expect(201);
  await request(app)
    .post(`${baseUrl}/objects`)
    .set("Cookie", admin.cookie)
    .send({ layerId: secondLayerId, name: "Checkpoint", geometry: { type: "Point", coordinates: [8.7, 50.12] } })
    .expect(201);
  await request(app).post(`${baseUrl}/revisions`).set("Cookie", admin.cookie).expect(200);

  return {
    id,
    firstLayerId,
    secondLayerId,
    firstObjectId: (firstObject.body as { id: string }).id,
  };
}

void describe("Data Package copies", () => {
  beforeEach(async () => {
    await clearDatabase();
    app = createApp();
    admin = await createUser("Admin", PERMISSIONS.map((permission) => ({ permission })));
    eventId = await createEvent();
  });

  after(async () => {
    await clearDatabase();
    await disconnectDatabase();
  });

  void it("turns one published layer into an independent draft and retains its provenance", async () => {
    const source = await createPublishedSource();
    const copied = await request(app)
      .post(`/api/v1/events/${eventId}/data-package-copies`)
      .set("Cookie", admin.cookie)
      .send({ name: "Layer copy", packages: [{ packageId: source.id, layerIds: [source.firstLayerId] }] })
      .expect(201);

    const target = copied.body as {
      id: string;
      latestRevision: number | null;
      sources: Array<{
        sourcePackageId: string;
        sourcePackageName: string;
        sourceRevision: number;
        sourceSnapshotHash: string;
        sourceLayerIds: string[];
      }>;
    };
    assert.notEqual(target.id, source.id);
    assert.equal(target.latestRevision, null);
    assert.equal(target.sources.length, 1);
    assert.equal(target.sources[0]?.sourcePackageId, source.id);
    assert.equal(target.sources[0]?.sourcePackageName, "Source package");
    assert.equal(target.sources[0]?.sourceRevision, 1);
    assert.match(target.sources[0]?.sourceSnapshotHash ?? "", /^[a-f0-9]{64}$/);
    assert.deepEqual(target.sources[0]?.sourceLayerIds, [source.firstLayerId]);

    const baseUrl = `/api/v1/events/${eventId}/data-packages/${target.id}`;
    const targetLayers = await request(app).get(`${baseUrl}/layers`).set("Cookie", admin.cookie).expect(200);
    const layerItems = (targetLayers.body as { items: Array<{ id: string; name: string; locked: boolean }> }).items;
    assert.equal(layerItems.length, 1);
    assert.equal(layerItems[0]?.name, "Layer 1");
    assert.equal(layerItems[0]?.locked, false);
    assert.notEqual(layerItems[0]?.id, source.firstLayerId);

    const targetObjects = await request(app).get(`${baseUrl}/objects`).set("Cookie", admin.cookie).expect(200);
    const objectItems = (targetObjects.body as { items: Array<{ id: string; layerId: string; name: string }> }).items;
    assert.equal(objectItems.length, 1);
    assert.equal(objectItems[0]?.name, "Rally");
    assert.equal(objectItems[0]?.layerId, layerItems[0]?.id);
    assert.notEqual(objectItems[0]?.id, source.firstObjectId);

    await request(app)
      .delete(`/api/v1/events/${eventId}/data-packages/${source.id}`)
      .set("Cookie", admin.cookie)
      .expect(204);
    const afterSourceDeletion = await request(app).get(baseUrl).set("Cookie", admin.cookie).expect(200);
    assert.equal((afterSourceDeletion.body as typeof target).sources[0]?.sourcePackageId, source.id);
    assert.equal(await database.auditEvent.count({ where: { action: "data-package.copied" } }), 1);
  });

  void it("requires published source content plus read and edit permissions in the same event", async () => {
    const draft = await request(app)
      .post(`/api/v1/events/${eventId}/data-packages`)
      .set("Cookie", admin.cookie)
      .send({ name: "Draft" })
      .expect(201);
    const draftId = (draft.body as { id: string }).id;
    await request(app)
      .post(`/api/v1/events/${eventId}/data-package-copies`)
      .set("Cookie", admin.cookie)
      .send({ name: "Empty", packages: [{ packageId: draftId }] })
      .expect(409);

    const source = await createPublishedSource();
    const reader = await createUser("Reader", [{ permission: "data-packages.read", eventId }]);
    await request(app)
      .post(`/api/v1/events/${eventId}/data-package-copies`)
      .set("Cookie", reader.cookie)
      .send({ name: "Denied", packages: [{ packageId: source.id }] })
      .expect(403);

    const otherEvent = await createEvent();
    await request(app)
      .post(`/api/v1/events/${otherEvent}/data-package-copies`)
      .set("Cookie", admin.cookie)
      .send({ name: "Wrong event", packages: [{ packageId: source.id }] })
      .expect(404);
  });
});
