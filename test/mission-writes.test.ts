import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, beforeEach, describe, it } from "node:test";
import type { Express } from "express";
import request from "supertest";
import { createApp } from "../src/app.js";
import { findVisibleMission } from "../src/modules/missions/mission-access.js";
import { writeFromStream, writeMissionItem } from "../src/modules/missions/mission-writes.js";
import { takAccessFor } from "../src/modules/tak-server/tak-access.js";
import { PERMISSIONS } from "../src/shared/auth/permissions.js";
import { database, disconnectDatabase } from "../src/shared/database/database.js";
import { clearDatabase, createEvent, createUser, type TestUser } from "./support/identity.js";

const none = { groupIds: [], roleIds: [], memberIds: [] };

let app: Express;
let admin: TestUser;
let eventId: string;
let groupId: string;
let roleId: string;

function packagesUrl(path = ""): string {
  return `/api/v1/events/${eventId}/data-packages${path}`;
}

let shortNameNumber = 0;

async function member(name: string): Promise<TestUser> {
  shortNameNumber += 1;
  const user = await createUser(name, []);
  await database.eventMember.create({
    data: { id: randomUUID(), eventId, userId: user.id, eventRoleId: roleId, eventGroupId: groupId, username: name, callsign: name, shortNameNumber },
  });
  return user;
}

/** A marker as ATAK sends it into a mission. */
function markerCot(uid: string, name: string, mission: string): string {
  const now = new Date().toISOString();
  const stale = new Date(Date.now() + 3_600_000).toISOString();
  return (
    `<?xml version="1.0" encoding="UTF-8"?><event version="2.0" uid="${uid}" type="a-h-G" how="h-g-i-g-o" time="${now}" start="${now}" stale="${stale}">` +
    `<point lat="52.51" lon="13.41" hae="9999999.0" ce="9999999.0" le="9999999.0"/>` +
    `<detail><contact callsign="${name}"/><marti><dest mission="${mission}"/></marti></detail></event>`
  );
}

void describe("mission changes from TAK apps", () => {
  beforeEach(async () => {
    await clearDatabase();
    app = createApp();
    admin = await createUser("Admin", PERMISSIONS.map((permission) => ({ permission })));
    eventId = await createEvent();
    await database.event.update({ where: { id: eventId }, data: { status: "active" } });
    roleId = randomUUID();
    groupId = randomUUID();
    await database.eventRole.create({ data: { id: roleId, eventId, name: "Participant", slug: "participant" } });
    await database.eventGroup.create({ data: { id: groupId, eventId, name: "Bravo", slug: "bravo", shortNamePrefix: "B" } });
  });

  after(async () => {
    await clearDatabase();
    await disconnectDatabase();
  });

  void it("puts a writer's marker into the draft and a new revision, without syncing the planner's draft", async () => {
    const mission = (await request(app).post(packagesUrl()).set("Cookie", admin.cookie).send({ name: "Lageplan Nord", kind: "mission" }).expect(201))
      .body as { id: string };
    await request(app).post(packagesUrl(`/${mission.id}/revisions`)).set("Cookie", admin.cookie).expect(200);
    const layers = (await request(app).get(packagesUrl(`/${mission.id}/layers`)).set("Cookie", admin.cookie).expect(200)).body as { items: Array<{ id: string }> };
    // The planner draws something but does not sync it.
    await request(app)
      .post(packagesUrl(`/${mission.id}/objects`))
      .set("Cookie", admin.cookie)
      .send({ layerId: layers.items[0]?.id, name: "Unsynced plan", geometry: { type: "Point", coordinates: [13.4, 52.5] } })
      .expect(201);

    const reader = await member("Reader");
    const writer = await member("Writer");
    const writerMember = await database.eventMember.findFirstOrThrow({ where: { userId: writer.id } });
    const current = (await request(app).get(packagesUrl(`/${mission.id}`)).set("Cookie", admin.cookie).expect(200)).body as { version: number };
    await request(app)
      .put(packagesUrl(`/${mission.id}/writers`))
      .set("Cookie", admin.cookie)
      .send({ version: current.version, writers: { ...none, memberIds: [writerMember.id] } })
      .expect(200);

    const bridge = randomUUID();
    const readerView = await findVisibleMission(reader.id, await takAccessFor(reader.id), { name: "Lageplan Nord" });
    assert.ok(readerView);
    assert.equal(await writeMissionItem(readerView, { userId: reader.id, clientUid: "ANDROID-READER" }, { kind: "upsert", xml: markerCot(bridge, "Bridge", "Lageplan Nord") }), "forbidden");

    await writeFromStream(writer.id, await takAccessFor(writer.id), "ANDROID-WRITER", ["Lageplan Nord", "Unknown"], markerCot(bridge, "Bridge blown", "Lageplan Nord"));
    const draft = await database.packageObject.findUnique({ where: { id: bridge } });
    assert.equal(draft?.name, "Bridge blown");
    const takLayer = await database.packageLayer.findFirst({ where: { packageId: mission.id, name: "From TAK apps" } });
    assert.equal(draft?.layerId, takLayer?.id, "new items land on the TAK layer");

    const latest = await database.packageRevision.findFirstOrThrow({ where: { packageId: mission.id }, orderBy: { number: "desc" } });
    assert.equal(latest.number, 2);
    assert.equal(latest.createdByType, "tak-client");
    assert.equal(latest.createdById, "ANDROID-WRITER");
    const names = (latest.snapshot as { objects: Array<{ name: string }> }).objects.map(({ name }) => name);
    assert.deepEqual(names, ["Bridge blown"], "the planner's unsynced item stays out of the revision");

    const writerView = await findVisibleMission(writer.id, await takAccessFor(writer.id), { name: "Lageplan Nord" });
    assert.ok(writerView);
    assert.equal(await writeMissionItem(writerView, { userId: writer.id, clientUid: "ANDROID-WRITER" }, { kind: "remove", uid: bridge }), "applied");
    assert.equal(await database.packageObject.count({ where: { id: bridge } }), 0);
    const afterRemoval = await database.packageRevision.findFirstOrThrow({ where: { packageId: mission.id }, orderBy: { number: "desc" } });
    assert.deepEqual((afterRemoval.snapshot as { objects: unknown[] }).objects, []);
    assert.equal(await writeMissionItem(writerView, { userId: writer.id, clientUid: "ANDROID-WRITER" }, { kind: "remove", uid: "not-a-uuid" }), "ignored");
  });
});
