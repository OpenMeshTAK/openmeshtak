import assert from "node:assert/strict";
import { after, beforeEach, describe, it } from "node:test";
import type { Express } from "express";
import request from "supertest";
import { createApp } from "../src/app.js";
import { database, disconnectDatabase } from "../src/shared/database/database.js";
import { clearDatabase, createEvent, createUser, type TestUser } from "./support/identity.js";

interface MissionBody {
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

function missionsUrl(event = eventId): string {
  return `/api/v1/events/${event}/missions`;
}

async function createMission(name = "Operation Phoenix"): Promise<MissionBody> {
  const response = await request(app).post(missionsUrl()).set("Cookie", editor.cookie).send({ name }).expect(201);
  return response.body as MissionBody;
}

async function listLayers(missionId: string): Promise<LayerBody[]> {
  const response = await request(app)
    .get(`${missionsUrl()}/${missionId}/layers`)
    .set("Cookie", editor.cookie)
    .expect(200);
  return (response.body as { items: LayerBody[] }).items;
}

void describe("missions and layers", () => {
  beforeEach(async () => {
    await clearDatabase();
    app = createApp();
    eventId = await createEvent();
    editor = await createUser("Editor", [
      { permission: "missions.read", eventId },
      { permission: "missions.edit", eventId },
    ]);
  });

  after(async () => {
    await clearDatabase();
    await disconnectDatabase();
  });

  void it("creates a mission with one empty layer and audits it", async () => {
    const mission = await createMission();
    assert.equal(mission.latestRevision, null);

    const layers = await listLayers(mission.id);
    assert.deepEqual(
      layers.map(({ name, sortOrder, visible, locked }) => ({ name, sortOrder, visible, locked })),
      [{ name: "Layer 1", sortOrder: 0, visible: true, locked: false }],
    );
    assert.equal(await database.auditEvent.count({ where: { action: "mission.created", targetId: mission.id } }), 1);
  });

  void it("updates missions and layers with optimistic concurrency", async () => {
    const mission = await createMission();
    const renamed = await request(app)
      .put(`${missionsUrl()}/${mission.id}`)
      .set("Cookie", editor.cookie)
      .send({ version: 1, name: "Phoenix", description: "Night exercise" })
      .expect(200);
    assert.equal((renamed.body as MissionBody).version, 2);
    await request(app)
      .put(`${missionsUrl()}/${mission.id}`)
      .set("Cookie", editor.cookie)
      .send({ version: 1, name: "Stale", description: null })
      .expect(409);

    const added = await request(app)
      .post(`${missionsUrl()}/${mission.id}/layers`)
      .set("Cookie", editor.cookie)
      .send({ name: "Routes" })
      .expect(201);
    const layer = added.body as LayerBody;
    assert.equal(layer.sortOrder, 1);

    const hidden = await request(app)
      .put(`${missionsUrl()}/${mission.id}/layers/${layer.id}`)
      .set("Cookie", editor.cookie)
      .send({ version: 1, name: "Routes", sortOrder: 0, visible: false, locked: true })
      .expect(200);
    assert.deepEqual(
      { visible: (hidden.body as LayerBody).visible, locked: (hidden.body as LayerBody).locked },
      { visible: false, locked: true },
    );

    await request(app)
      .delete(`${missionsUrl()}/${mission.id}/layers/${layer.id}`)
      .set("Cookie", editor.cookie)
      .expect(204);
    assert.equal((await listLayers(mission.id)).length, 1);
  });

  void it("separates reading from editing and conceals other events", async () => {
    const mission = await createMission();
    const reader = await createUser("Reader", [{ permission: "missions.read", eventId }]);
    await request(app).get(`${missionsUrl()}/${mission.id}`).set("Cookie", reader.cookie).expect(200);
    await request(app).post(missionsUrl()).set("Cookie", reader.cookie).send({ name: "Nope" }).expect(403);

    const otherEvent = await createEvent();
    const outsider = await createUser("Outsider", [{ permission: "missions.read", eventId: otherEvent }]);
    await request(app).get(`${missionsUrl()}/${mission.id}`).set("Cookie", outsider.cookie).expect(404);
    await request(app)
      .get(`${missionsUrl(otherEvent)}/${mission.id}`)
      .set("Cookie", outsider.cookie)
      .expect(404);
  });

  void it("keeps missions of archived events read-only", async () => {
    const mission = await createMission();
    await database.event.update({ where: { id: eventId }, data: { status: "archived" } });

    await request(app).get(`${missionsUrl()}/${mission.id}/layers`).set("Cookie", editor.cookie).expect(200);
    const response = await request(app)
      .post(`${missionsUrl()}/${mission.id}/layers`)
      .set("Cookie", editor.cookie)
      .send({ name: "Late" })
      .expect(409);
    assert.equal((response.body as { code: string }).code, "EVENT_ARCHIVED");
  });

  void it("deletes a mission with its layers", async () => {
    const mission = await createMission();
    await request(app).delete(`${missionsUrl()}/${mission.id}`).set("Cookie", editor.cookie).expect(204);
    assert.equal(await database.missionLayer.count(), 0);
    await request(app).get(`${missionsUrl()}/${mission.id}`).set("Cookie", editor.cookie).expect(404);
  });
});
