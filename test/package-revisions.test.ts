import assert from "node:assert/strict";
import { after, beforeEach, describe, it } from "node:test";
import type { Express } from "express";
import request from "supertest";
import type { PackageObjectDto } from "../src/modules/data-packages/package-object.dto.js";
import type { PublishDataPackageResponse } from "../src/modules/data-packages/package-revision.dto.js";
import { createApp } from "../src/app.js";
import { database, disconnectDatabase } from "../src/shared/database/database.js";
import { clearDatabase, createEvent, createUser, type TestUser } from "./support/identity.js";

interface PublishBody {
  created: boolean;
  revision: { number: number; snapshotHash: string; snapshot: { objects: Array<{ name: string }> } };
}

let app: Express;
let editor: TestUser;
let packageUrl: string;
let layerId: string;

async function addPoint(name: string): Promise<{ id: string }> {
  const response = await request(app)
    .post(`${packageUrl}/objects`)
    .set("Cookie", editor.cookie)
    .send({ layerId, name, geometry: { type: "Point", coordinates: [8, 50] } })
    .expect(201);
  return response.body as { id: string };
}

async function publish(user = editor): Promise<PublishBody> {
  const response = await request(app).post(`${packageUrl}/revisions`).set("Cookie", user.cookie).expect(200);
  return response.body as PublishBody;
}

void describe("data package revisions", () => {
  beforeEach(async () => {
    await clearDatabase();
    app = createApp();
    const eventId = await createEvent();
    editor = await createUser("Editor", [
      { permission: "data-packages.read", eventId },
      { permission: "data-packages.edit", eventId },
      { permission: "data-packages.publish", eventId },
    ]);
    const dataPackage = await request(app)
      .post(`/api/v1/events/${eventId}/data-packages`)
      .set("Cookie", editor.cookie)
      .send({ name: "Phoenix" })
      .expect(201);
    packageUrl = `/api/v1/events/${eventId}/data-packages/${(dataPackage.body as { id: string }).id}`;
    const layers = await request(app).get(`${packageUrl}/layers`).set("Cookie", editor.cookie).expect(200);
    layerId = (layers.body as { items: Array<{ id: string }> }).items[0]?.id ?? "";
  });

  after(async () => {
    await clearDatabase();
    await disconnectDatabase();
  });

  void it("publishes numbered revisions and skips unchanged drafts", async () => {
    await addPoint("Rally point");
    const first = await publish();
    assert.equal(first.created, true);
    assert.equal(first.revision.number, 1);

    const unchanged = await publish();
    assert.equal(unchanged.created, false);
    assert.equal(unchanged.revision.number, 1);

    await addPoint("Checkpoint");
    const second = await publish();
    assert.equal(second.revision.number, 2);
    assert.notEqual(second.revision.snapshotHash, first.revision.snapshotHash);

    const dataPackage = await request(app).get(packageUrl).set("Cookie", editor.cookie).expect(200);
    assert.equal((dataPackage.body as { latestRevision: number }).latestRevision, 2);
  });

  void it("reports unpublished draft changes and the published size", async () => {
    interface PackageState {
      hasUnpublishedChanges: boolean;
      latestRevisionSize: number | null;
      draftContents: { points: number; polygons: number };
      version: number;
    }
    const state = async (): Promise<PackageState> =>
      (await request(app).get(packageUrl).set("Cookie", editor.cookie).expect(200)).body as PackageState;

    const draft = await state();
    assert.equal(draft.hasUnpublishedChanges, true);
    assert.equal(draft.latestRevisionSize, null);

    const point = await addPoint("Rally point");
    await publish();
    const published = await state();
    assert.equal(published.hasUnpublishedChanges, false);
    assert.ok((published.latestRevisionSize ?? 0) > 0);
    assert.equal(published.draftContents.points, 1);
    assert.equal(published.draftContents.polygons, 0);

    const revision = await database.packageRevision.findFirstOrThrow({ select: { exportSize: true } });
    assert.equal(revision.exportSize, published.latestRevisionSize);

    // Locking is editor-only state outside the snapshot: the cache is cleared but nothing changed.
    const layers = await request(app).get(`${packageUrl}/layers`).set("Cookie", editor.cookie).expect(200);
    const [layer] = (layers.body as { items: Array<{ name: string; sortOrder: number; visible: boolean; version: number }> })
      .items;
    assert.ok(layer);
    await request(app)
      .put(`${packageUrl}/layers/${layerId}`)
      .set("Cookie", editor.cookie)
      .send({ name: layer.name, sortOrder: layer.sortOrder, visible: layer.visible, locked: true, version: layer.version })
      .expect(200);
    assert.equal((await state()).hasUnpublishedChanges, false);

    // A deletion leaves no timestamp behind, so it must still count as a change.
    await request(app)
      .put(`${packageUrl}/layers/${layerId}`)
      .set("Cookie", editor.cookie)
      .send({ name: layer.name, sortOrder: layer.sortOrder, visible: layer.visible, locked: false, version: layer.version + 1 })
      .expect(200);
    await request(app).delete(`${packageUrl}/objects/${point.id}`).set("Cookie", editor.cookie).expect(204);
    assert.equal((await state()).hasUnpublishedChanges, true);

    await publish();
    assert.equal((await state()).hasUnpublishedChanges, false);
    const renamed = await request(app)
      .put(packageUrl)
      .set("Cookie", editor.cookie)
      .send({ name: "Phoenix 2", description: null, version: (await state()).version })
      .expect(200);
    assert.equal((renamed.body as PackageState).hasUnpublishedChanges, true);
  });

  void it("freezes arrow style in revisions independently of later draft edits", async () => {
    const geometry = { type: "LineString", coordinates: [[8, 50], [8.1, 50.1]] };
    const created = await request(app).post(`${packageUrl}/objects`).set("Cookie", editor.cookie).send({
      layerId, name: "Arrow", geometry, style: { color: "#123456", strokeWidth: 3, fillOpacity: 0, arrowHeads: "end", arrowHeadSize: 24 },
    }).expect(201);
    const object = created.body as PackageObjectDto;
    const first = (await request(app).post(`${packageUrl}/revisions`).set("Cookie", editor.cookie).expect(200)).body as PublishDataPackageResponse;
    assert.equal(first.revision.snapshot.objects[0]?.style.arrowHeads, "end");
    await request(app).put(`${packageUrl}/objects/${object.id}`).set("Cookie", editor.cookie).send({
      version: object.version, layerId, name: object.name, description: object.description, geometry: object.geometry, tak: null,
      style: { ...object.style, arrowHeads: "both" },
    }).expect(200);
    const second = (await request(app).post(`${packageUrl}/revisions`).set("Cookie", editor.cookie).expect(200)).body as PublishDataPackageResponse;
    assert.equal(second.revision.snapshot.objects[0]?.style.arrowHeads, "both");
    assert.equal(second.revision.snapshot.objects[0]?.id, object.id);
    assert.notEqual(first.revision.snapshotHash, second.revision.snapshotHash);
    const old = (await request(app).get(`${packageUrl}/revisions/1`).set("Cookie", editor.cookie).expect(200)).body as PublishDataPackageResponse["revision"];
    assert.equal(old.snapshot.objects[0]?.style.arrowHeads, "end");
  });

  void it("keeps published revisions unchanged when the draft changes later", async () => {
    const point = await addPoint("Rally point");
    await publish();
    await request(app).delete(`${packageUrl}/objects/${point.id}`).set("Cookie", editor.cookie).expect(204);

    const revision = await request(app).get(`${packageUrl}/revisions/1`).set("Cookie", editor.cookie).expect(200);
    assert.deepEqual(
      (revision.body as PublishBody["revision"]).snapshot.objects.map(({ name }) => name),
      ["Rally point"],
    );
    assert.equal(await database.auditEvent.count({ where: { action: "data-package.published" } }), 1);
  });

  void it("requires data-packages.publish", async () => {
    const eventId = packageUrl.split("/")[4] ?? "";
    const writer = await createUser("Writer", [
      { permission: "data-packages.read", eventId },
      { permission: "data-packages.edit", eventId },
    ]);
    await request(app).post(`${packageUrl}/revisions`).set("Cookie", writer.cookie).expect(403);
  });
});
