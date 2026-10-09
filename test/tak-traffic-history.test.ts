import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, beforeEach, describe, it } from "node:test";
import type { Express } from "express";
import request from "supertest";
import { createApp } from "../src/app.js";
import { buildTracks, type RecordedPosition } from "../src/modules/tak-server/traffic-history.js";
import { database, disconnectDatabase } from "../src/shared/database/database.js";
import { clearDatabase, createEvent, createUser } from "./support/identity.js";

const START = Date.parse("2026-10-01T10:00:00.000Z");

function position(uid: string, secondsAfterStart: number, overrides: Partial<RecordedPosition> = {}): RecordedPosition {
  const time = new Date(START + secondsAfterStart * 1000);
  return {
    uid,
    type: "a-f-G-U-C",
    callsign: uid,
    lat: 52.4 + secondsAfterStart * 0.00001,
    lon: 11.6,
    time,
    receivedAt: time,
    how: "m-g",
    ce: 10,
    selfReported: true,
    userId: "user",
    ...overrides,
  };
}

void describe("track building", () => {
  void it("orders delayed positions by their own time and drops duplicates", () => {
    const [track] = buildTracks([
      position("A", 0),
      position("A", 20, { receivedAt: new Date(START + 600_000) }),
      position("A", 10),
      position("A", 10, { receivedAt: new Date(START + 15_000) }),
    ]);
    assert.ok(track);
    assert.equal(track.segments.length, 1);
    assert.deepEqual(track.segments[0]?.map(({ time }) => time.getTime() - START), [0, 10_000, 20_000]);
    assert.deepEqual(track.segments[0]?.map(({ delayed }) => delayed), [false, false, true]);
    assert.equal(track.duplicatesDropped, 1);
    assert.equal(track.pointCount, 3);
  });

  void it("breaks the track at gaps, implausible jumps and approximate positions", () => {
    const [track] = buildTracks(
      [
        position("A", 0),
        position("A", 30),
        position("A", 400),
        position("A", 410, { lat: 53.4 }),
        position("A", 420, { lat: 53.4, ce: 1500 }),
        position("A", 430, { lat: 53.4001 }),
      ],
      300,
    );
    assert.ok(track);
    assert.deepEqual(
      track.segments.map((segment) => segment.map(({ time }) => (time.getTime() - START) / 1000)),
      [[0, 30], [400], [410], [420], [430]],
    );
    assert.equal(track.segments[3]?.[0]?.approximate, true);
  });
});

void describe("TAK traffic history API", () => {
  let app: Express;

  beforeEach(async () => {
    await clearDatabase();
    app = createApp();
  });

  after(async () => {
    await clearDatabase();
    await disconnectDatabase();
  });

  async function eventWithTraffic(): Promise<{ eventId: string; groupId: string; alphaId: string }> {
    const eventId = await createEvent();
    const roleId = randomUUID();
    const groupId = randomUUID();
    const otherGroupId = randomUUID();
    await database.eventRole.create({ data: { id: roleId, eventId, name: "Participant", slug: "participant" } });
    await database.eventGroup.create({ data: { id: groupId, eventId, name: "Bravo", slug: "bravo" } });
    await database.eventGroup.create({ data: { id: otherGroupId, eventId, name: "Charlie", slug: "charlie" } });
    const alpha = await createUser("Alpha", []);
    const zulu = await createUser("Zulu", []);
    await database.eventMember.create({
      data: { id: randomUUID(), eventId, userId: alpha.id, eventRoleId: roleId, eventGroupId: groupId, username: "Alpha", callsign: "Alpha", shortNameNumber: 1 },
    });
    await database.eventMember.create({
      data: { id: randomUUID(), eventId, userId: zulu.id, eventRoleId: roleId, eventGroupId: otherGroupId, username: "Zulu", callsign: "Zulu", shortNameNumber: 2 },
    });
    const rows = [
      { uid: "ALPHA", userId: alpha.id, seconds: 0 },
      { uid: "ALPHA", userId: alpha.id, seconds: 10 },
      { uid: "ZULU", userId: zulu.id, seconds: 5 },
      { uid: "DRAWING", userId: zulu.id, seconds: 5, type: "u-d-f" },
    ];
    await database.takTrafficItem.createMany({
      data: rows.map(({ uid, userId, seconds, type }) => ({
        id: randomUUID(),
        eventId,
        uid,
        type: type ?? "a-f-G-U-C",
        callsign: uid,
        lat: 52.4,
        lon: 11.6,
        time: new Date(START + seconds * 1000),
        stale: new Date(START + 600_000),
        ce: 10,
        how: "m-g",
        selfReported: true,
        userId,
      })),
    });
    return { eventId, groupId, alphaId: alpha.id };
  }

  const range = `from=${encodeURIComponent("2026-10-01T09:00:00Z")}&to=${encodeURIComponent("2026-10-01T11:00:00+00:00")}`;

  void it("returns tracks of a range, filters by group and audits every request", async () => {
    const { eventId, groupId } = await eventWithTraffic();
    const viewer = await createUser("Viewer", [{ permission: "tak-traffic.view", eventId }]);
    const history = (await request(app).get(`/api/v1/events/${eventId}/tak-traffic/history?${range}`).set("Cookie", viewer.cookie).expect(200))
      .body as { tracks: Array<{ uid: string; sender: { eventGroupName: string | null } }>; groups: Array<{ name: string }>; truncated: boolean };
    assert.deepEqual(history.tracks.map(({ uid }) => uid), ["ALPHA", "ZULU"], "drawings have no track");
    assert.equal(history.tracks[0]?.sender.eventGroupName, "Bravo");
    assert.deepEqual(history.groups.map(({ name }) => name), ["Bravo", "Charlie"]);
    assert.equal(history.truncated, false);

    const bravo = (await request(app).get(`/api/v1/events/${eventId}/tak-traffic/history?${range}&groupId=${groupId}`).set("Cookie", viewer.cookie).expect(200))
      .body as { tracks: Array<{ uid: string }> };
    assert.deepEqual(bravo.tracks.map(({ uid }) => uid), ["ALPHA"]);
    assert.equal(await database.auditEvent.count({ where: { action: "tak-traffic.history-viewed" } }), 2);

    await request(app).get(`/api/v1/events/${eventId}/tak-traffic/history?${range}&groupId=${randomUUID()}`).set("Cookie", viewer.cookie).expect(404);
    await request(app).get(`/api/v1/events/${eventId}/tak-traffic/history?from=2026-10-01T09:00:00&to=2026-10-01T11:00:00Z`).set("Cookie", viewer.cookie).expect(422);
    await request(app).get(`/api/v1/events/${eventId}/tak-traffic/history?${range}&sort=time`).set("Cookie", viewer.cookie).expect(422);
  });

  void it("requires tak-traffic.view and never shows another event's traffic", async () => {
    const { eventId } = await eventWithTraffic();
    const otherEvent = await createEvent();
    const reader = await createUser("Reader", [{ permission: "events.read", eventId }]);
    await request(app).get(`/api/v1/events/${eventId}/tak-traffic/history?${range}`).set("Cookie", reader.cookie).expect(403);
    const viewer = await createUser("Viewer", [{ permission: "tak-traffic.view", eventId: otherEvent }]);
    await request(app).get(`/api/v1/events/${eventId}/tak-traffic/history?${range}`).set("Cookie", viewer.cookie).expect(404);
    const empty = (await request(app).get(`/api/v1/events/${otherEvent}/tak-traffic/history?${range}`).set("Cookie", viewer.cookie).expect(200))
      .body as { tracks: unknown[] };
    assert.deepEqual(empty.tracks, []);
  });

  void it("exports tracks as GPX and GeoJSON", async () => {
    const { eventId } = await eventWithTraffic();
    const viewer = await createUser("Viewer", [{ permission: "tak-traffic.view", eventId }]);
    const gpx = await request(app).get(`/api/v1/events/${eventId}/tak-traffic/history/export?format=gpx&${range}`).set("Cookie", viewer.cookie).expect(200);
    assert.match(gpx.headers["content-type"] ?? "", /application\/gpx\+xml/);
    assert.match(gpx.text, /<trk><name>ALPHA<\/name>.*<trkseg><trkpt lat="52\.4000000" lon="11\.6000000"><time>2026-10-01T10:00:00\.000Z<\/time><\/trkpt>/);
    const geojson = await request(app)
      .get(`/api/v1/events/${eventId}/tak-traffic/history/export?format=geojson&${range}&uid=ALPHA`)
      .set("Cookie", viewer.cookie)
      .buffer(true)
      .parse((response, callback) => {
        let text = "";
        response.on("data", (chunk: Buffer) => (text += chunk.toString("utf8")));
        response.on("end", () => callback(null, text));
      })
      .expect(200);
    const collection = JSON.parse(geojson.body as string) as { features: Array<{ geometry: { type: string }; properties: { uid: string } }> };
    assert.deepEqual(collection.features.map(({ geometry, properties }) => [properties.uid, geometry.type]), [["ALPHA", "LineString"]]);
    assert.equal(await database.auditEvent.count({ where: { action: "tak-traffic.exported" } }), 2);
  });

  void it("deletes recorded traffic of one UID or the whole event with events.manage", async () => {
    const { eventId } = await eventWithTraffic();
    const viewer = await createUser("Viewer", [{ permission: "tak-traffic.view", eventId }]);
    await request(app).delete(`/api/v1/events/${eventId}/tak-traffic/recording/items`).set("Cookie", viewer.cookie).expect(403);
    const manager = await createUser("Manager", [{ permission: "events.manage", eventId }]);
    const one = (await request(app).delete(`/api/v1/events/${eventId}/tak-traffic/recording/items?uid=ALPHA`).set("Cookie", manager.cookie).expect(200))
      .body as { deleted: number };
    assert.equal(one.deleted, 2);
    const rest = (await request(app).delete(`/api/v1/events/${eventId}/tak-traffic/recording/items`).set("Cookie", manager.cookie).expect(200)).body as {
      deleted: number;
    };
    assert.equal(rest.deleted, 2);
    assert.equal(await database.takTrafficItem.count({ where: { eventId } }), 0);
    assert.equal(await database.auditEvent.count({ where: { action: "tak-traffic.deleted" } }), 2);
  });
});
