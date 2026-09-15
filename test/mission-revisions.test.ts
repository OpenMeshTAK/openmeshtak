import assert from "node:assert/strict";
import { after, beforeEach, describe, it } from "node:test";
import type { Express } from "express";
import request from "supertest";
import { createApp } from "../src/app.js";
import { database, disconnectDatabase } from "../src/shared/database/database.js";
import { clearDatabase, createEvent, createUser, type TestUser } from "./support/identity.js";

interface PublishBody {
  created: boolean;
  revision: { number: number; snapshotHash: string; snapshot: { objects: Array<{ name: string }> } };
}

let app: Express;
let editor: TestUser;
let missionUrl: string;
let layerId: string;

async function addPoint(name: string): Promise<{ id: string }> {
  const response = await request(app)
    .post(`${missionUrl}/objects`)
    .set("Cookie", editor.cookie)
    .send({ layerId, name, geometry: { type: "Point", coordinates: [8, 50] } })
    .expect(201);
  return response.body as { id: string };
}

async function publish(user = editor): Promise<PublishBody> {
  const response = await request(app).post(`${missionUrl}/revisions`).set("Cookie", user.cookie).expect(200);
  return response.body as PublishBody;
}

void describe("mission revisions", () => {
  beforeEach(async () => {
    await clearDatabase();
    app = createApp();
    const eventId = await createEvent();
    editor = await createUser("Editor", [
      { permission: "missions.read", eventId },
      { permission: "missions.edit", eventId },
      { permission: "missions.publish", eventId },
    ]);
    const mission = await request(app)
      .post(`/api/v1/events/${eventId}/missions`)
      .set("Cookie", editor.cookie)
      .send({ name: "Phoenix" })
      .expect(201);
    missionUrl = `/api/v1/events/${eventId}/missions/${(mission.body as { id: string }).id}`;
    const layers = await request(app).get(`${missionUrl}/layers`).set("Cookie", editor.cookie).expect(200);
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

    const mission = await request(app).get(missionUrl).set("Cookie", editor.cookie).expect(200);
    assert.equal((mission.body as { latestRevision: number }).latestRevision, 2);
  });

  void it("keeps published revisions unchanged when the draft changes later", async () => {
    const point = await addPoint("Rally point");
    await publish();
    await request(app).delete(`${missionUrl}/objects/${point.id}`).set("Cookie", editor.cookie).expect(204);

    const revision = await request(app).get(`${missionUrl}/revisions/1`).set("Cookie", editor.cookie).expect(200);
    assert.deepEqual(
      (revision.body as PublishBody["revision"]).snapshot.objects.map(({ name }) => name),
      ["Rally point"],
    );
    assert.equal(await database.auditEvent.count({ where: { action: "mission.published" } }), 1);
  });

  void it("requires missions.publish", async () => {
    const eventId = missionUrl.split("/")[4] ?? "";
    const writer = await createUser("Writer", [
      { permission: "missions.read", eventId },
      { permission: "missions.edit", eventId },
    ]);
    await request(app).post(`${missionUrl}/revisions`).set("Cookie", writer.cookie).expect(403);
  });
});
