import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, beforeEach, describe, it } from "node:test";
import type { Express } from "express";
import request from "supertest";
import { createApp } from "../src/app.js";
import {
  parseInstant,
  positionIntervalSeconds,
  positionTime,
  precisionCe,
  receiveTimeProblem,
  staleAfterMs,
} from "../src/modules/mesh-uplink/mesh-observation-rules.js";
import { ingestMeshObservations } from "../src/modules/mesh-uplink/mesh-observations.service.js";
import type { MeshObservationDto } from "../src/modules/mesh-uplink/mesh-observation.dto.js";
import { getLiveTakTraffic } from "../src/modules/tak-server/live-traffic.service.js";
import { CotRouter, type CotPeer } from "../src/modules/tak-server/streaming/cot-router.js";
import { trafficRecorder } from "../src/modules/tak-server/traffic-recording.js";
import { database, disconnectDatabase } from "../src/shared/database/database.js";
import { clearDatabase, createApiClientKey, createEvent, createUser, type TestUser } from "./support/identity.js";

const HQ = "6f1c2c1e-1d55-4c39-9a53-5b7f3c1d2e4f";
const OTHER_HQ = "0b8f4f8e-7f0a-4b52-8f0e-2b2b6a0b1c3d";
const NODE = 0xa1b2c3d4;

function minutesAgo(minutes: number): string {
  return new Date(Date.now() - minutes * 60_000).toISOString();
}

function position(packetId: number, overrides: Partial<MeshObservationDto> = {}): MeshObservationDto {
  return {
    kind: "position",
    nodeNum: NODE,
    packetId,
    receivedAt: minutesAgo(0),
    position: { lat: 52.4, lon: 11.6 },
    ...overrides,
  };
}

function peer(eventId: string, userId: string, sent: string[]): CotPeer {
  return {
    id: randomUUID(),
    scope: new Map([[eventId, { groupId: null, seesAll: true, receives: null, sends: null }]]),
    send: (xml) => sent.push(xml),
    userId,
    certificateId: randomUUID(),
    callsign: null,
    deviceUid: null,
    connectedAt: new Date(),
    lastSeenAt: new Date(),
  };
}

void describe("mesh observation rules", () => {
  void it("trusts the HQ receive time and the packet time only when plausible", () => {
    const received = new Date("2026-10-16T10:00:00.000Z");
    assert.equal(positionTime(received, new Date("2026-10-16T09:58:00.000Z")).toISOString(), "2026-10-16T09:58:00.000Z");
    assert.equal(positionTime(received, new Date("2026-10-16T08:00:00.000Z")), received, "far older than received");
    assert.equal(positionTime(received, new Date("2026-10-16T10:05:00.000Z")), received, "after it was received");
    assert.equal(positionTime(received, new Date(0)), received, "no GPS time");
    assert.equal(positionTime(received, null), received);
  });

  void it("rejects receive times in the future or beyond the deduplication window", () => {
    const now = new Date("2026-10-16T10:00:00.000Z");
    assert.equal(receiveTimeProblem(new Date("2026-10-16T10:01:00.000Z"), now), null);
    assert.equal(receiveTimeProblem(new Date("2026-10-16T10:10:00.000Z"), now), "RECEIVED_IN_FUTURE");
    assert.equal(receiveTimeProblem(new Date("2026-10-08T10:00:00.000Z"), now), "TOO_OLD");
    assert.equal(parseInstant("2026-10-16T10:00:00"), null, "local time without offset");
  });

  void it("derives interval, staleness and precision", () => {
    assert.equal(positionIntervalSeconds(0), 900);
    assert.equal(positionIntervalSeconds(120), 120);
    assert.equal(staleAfterMs(900), 30 * 60_000);
    assert.equal(staleAfterMs(30), 5 * 60_000);
    assert.equal(staleAfterMs(86_400), 2 * 3_600_000);
    assert.equal(precisionCe(32), null);
    assert.equal(precisionCe(undefined), null);
    assert.equal(precisionCe(16), 365);
    assert.equal(precisionCe(13), 2918);
  });
});

void describe("mesh uplink API", () => {
  let app: Express;
  let eventId: string;
  let sender: TestUser;
  let memberId: string;
  let memberUserId: string;

  beforeEach(async () => {
    await clearDatabase();
    trafficRecorder.invalidate();
    app = createApp();
    eventId = await createEvent();
    await database.event.update({ where: { id: eventId }, data: { status: "active" } });
    const roleId = randomUUID();
    const groupId = randomUUID();
    await database.eventRole.create({ data: { id: roleId, eventId, name: "Participant", slug: "participant" } });
    await database.eventGroup.create({ data: { id: groupId, eventId, name: "Bravo", slug: "bravo", shortNamePrefix: "B" } });
    const member = await createUser("Peter", []);
    memberUserId = member.id;
    memberId = randomUUID();
    await database.eventMember.create({
      data: { id: memberId, eventId, userId: member.id, eventRoleId: roleId, eventGroupId: groupId, username: "Peter", callsign: "Peter [Bravo]", shortNameNumber: 1 },
    });
    sender = await createUser("HQ operator", [{ permission: "mesh-uplink.send", eventId }]);
  });

  after(async () => {
    await clearDatabase();
    await disconnectDatabase();
  });

  function upload(observations: MeshObservationDto[], hqId = HQ, cookie = sender.cookie) {
    return request(app).post(`/api/v1/events/${eventId}/mesh-observations`).set("Cookie", cookie).send({ hqId, hqName: "HQ North", observations });
  }

  async function enableRecording(): Promise<void> {
    await database.takTrafficRecording.create({ data: { eventId, enabled: true } });
    trafficRecorder.invalidate();
  }

  void it("requires mesh-uplink.send and an active Meshtastic event", async () => {
    const outsider = await createUser("Outsider", []);
    await upload([position(1)], HQ, outsider.cookie).expect(404);
    const viewer = await createUser("Viewer", [{ permission: "tak-traffic.view", eventId }]);
    await upload([position(1)], HQ, viewer.cookie).expect(403);
    const key = await createApiClientKey([{ permission: "mesh-uplink.send", eventId }]);
    await request(app)
      .post(`/api/v1/events/${eventId}/mesh-observations`)
      .set("Authorization", `Bearer ${key}`)
      .send({ hqId: HQ, observations: [position(9)] })
      .expect(200);

    await database.event.update({ where: { id: eventId }, data: { meshtasticEnabled: false } });
    assert.equal(((await upload([position(2)]).expect(409)).body as { code: string }).code, "MESHTASTIC_DISABLED");
    await database.event.update({ where: { id: eventId }, data: { meshtasticEnabled: true, status: "draft" } });
    assert.equal(((await upload([position(3)]).expect(409)).body as { code: string }).code, "EVENT_NOT_ACTIVE");
  });

  void it("validates batches strictly and rejects unusable observations one by one", async () => {
    await upload([]).expect(422);
    await upload(Array.from({ length: 201 }, (_, index) => position(index + 1))).expect(422);
    await upload([position(1, { position: { lat: 91, lon: 0 } })]).expect(422);
    await upload([position(1, { nodeNum: 0xffffffff })]).expect(422);
    await upload([{ ...position(1), psk: "AQ==" } as MeshObservationDto]).expect(422);
    await request(app).post(`/api/v1/events/${eventId}/mesh-observations`).set("Cookie", sender.cookie).send({ hqId: "hq-1", observations: [position(1)] }).expect(422);

    const response = await upload([
      position(1, { receivedAt: "2026-10-16T10:00:00" }),
      position(2, { receivedAt: new Date(Date.now() + 3_600_000).toISOString() }),
      position(3, { receivedAt: minutesAgo(8 * 24 * 60) }),
      position(4, { position: { lat: 0, lon: 0 } }),
      { kind: "position", nodeNum: NODE, packetId: 5, receivedAt: minutesAgo(0) },
      position(6),
    ]).expect(200);
    const body = response.body as { accepted: number; rejected: number; results: Array<{ status: string; code?: string }> };
    assert.deepEqual(
      body.results.map(({ status, code }) => code ?? status),
      ["INVALID_TIME", "RECEIVED_IN_FUTURE", "TOO_OLD", "NO_FIX", "NO_POSITION", "accepted"],
    );
    assert.equal(body.accepted, 1);
    assert.equal(body.rejected, 5);
  });

  void it("processes each packet once across retries, batches and HQs, and audits counts only", async () => {
    const first = await upload([position(10), position(10), { kind: "nodeinfo", nodeNum: NODE, packetId: 11, receivedAt: minutesAgo(0), shortName: "B1", longName: "Peter [Bravo]" }]).expect(200);
    assert.deepEqual((first.body as { results: Array<{ status: string }> }).results.map(({ status }) => status), ["accepted", "duplicate", "accepted"]);
    const retry = await upload([position(10), position(12)]).expect(200);
    assert.deepEqual((retry.body as { results: Array<{ status: string }> }).results.map(({ status }) => status), ["duplicate", "accepted"]);
    const otherHq = await upload([position(12)], OTHER_HQ).expect(200);
    assert.equal((otherHq.body as { duplicates: number }).duplicates, 1);

    const node = await database.meshtasticNode.findFirstOrThrow({ where: { eventId } });
    assert.equal(node.nodeId, "!a1b2c3d4");
    assert.equal(node.longName, "Peter [Bravo]");

    const audits = await database.auditEvent.findMany({ where: { action: "mesh-uplink.batch-received" } });
    assert.equal(audits.length, 3);
    const text = JSON.stringify(audits);
    assert.ok(!text.includes("52.4") && !text.includes("11.6"), "no positions in audit");
    assert.ok(text.includes(HQ));
  });

  void it("shows mesh positions in the live view only, never to TAK apps", async () => {
    const router = new CotRouter();
    const before: string[] = [];
    router.join(peer(eventId, memberUserId, before));
    const actor = { principal: { type: "user" as const, id: sender.id, authSubjectId: sender.authSubjectId, sessionCreatedAt: new Date() }, traceId: "test" };
    const result = await ingestMeshObservations(actor, eventId, { hqId: HQ, hqName: "HQ North", observations: [position(20, { shortName: "X", longName: "Stranger", batteryLevel: 80, channel: { index: 0, name: "LongFast" } })] }, router);
    assert.equal(result.accepted, 1);
    assert.deepEqual(before, [], "connected apps receive nothing");
    const late: string[] = [];
    router.join(peer(eventId, memberUserId, late));
    assert.deepEqual(late, [], "late joiners get no mesh replay");

    const viewer = await createUser("Viewer", [{ permission: "tak-traffic.view", eventId }]);
    const traffic = await getLiveTakTraffic({ type: "user", id: viewer.id, authSubjectId: viewer.authSubjectId, sessionCreatedAt: new Date() }, eventId, router);
    const [item] = traffic.items;
    assert.ok(item);
    assert.equal(item.uid, "meshtastic-a1b2c3d4");
    assert.equal(item.type, "a-u-G");
    assert.equal(item.callsign, "Stranger");
    assert.equal(item.source, "mesh");
    assert.equal(item.placedBy, null);
    assert.equal(item.mesh?.nodeNum, NODE);
    assert.equal(item.mesh?.hq.name, "HQ North");
    assert.deepEqual(item.mesh?.channel, { index: 0, name: "LongFast" });
    assert.equal(item.mesh?.batteryLevel, 80);
  });

  void it("drops mesh positions of members whose TAK app reported within the position interval", async () => {
    await database.meshtasticNode.create({ data: { id: randomUUID(), eventId, nodeId: "!a1b2c3d4", memberId, boundAt: new Date() } });
    const router = new CotRouter();
    const app = peer(eventId, memberUserId, []);
    app.callsign = "Peter [Bravo]";
    app.deviceUid = "ANDROID-peter";
    router.join(app);
    router.identify(app);
    const actor = { principal: { type: "user" as const, id: sender.id, authSubjectId: sender.authSubjectId, sessionCreatedAt: new Date() }, traceId: "test" };

    const fresh = await ingestMeshObservations(actor, eventId, { hqId: HQ, observations: [position(30)] }, router);
    assert.deepEqual(fresh.results, [{ status: "tak-preferred" }]);
    // Twenty minutes ago is outside the default 900 s interval: the mesh position counts and joins the member's track.
    const old = await ingestMeshObservations(actor, eventId, { hqId: HQ, observations: [position(31, { receivedAt: minutesAgo(20) })] }, router);
    assert.deepEqual(old.results, [{ status: "accepted" }]);
    const snapshot = router.snapshot(eventId);
    assert.equal(snapshot.meshItems[0]?.item.uid, "ANDROID-peter");
    assert.equal(snapshot.meshItems[0]?.userId, memberUserId);
    assert.equal(snapshot.meshItems[0]?.item.callsign, "Peter [Bravo]");
  });

  void it("records accepted positions with their source when the event records", async () => {
    await enableRecording();
    await database.meshtasticNode.create({ data: { id: randomUUID(), eventId, nodeId: "!a1b2c3d4", memberId, boundAt: new Date() } });
    const response = await upload([position(40, { position: { lat: 52.5, lon: 11.7, precisionBits: 16 } }), position(41, { nodeNum: 0x1234 })]).expect(200);
    assert.equal((response.body as { recorded: number }).recorded, 2);
    const rows = await database.takTrafficItem.findMany({ where: { eventId }, orderBy: { lat: "desc" } });
    assert.equal(rows.length, 2);
    assert.equal(rows[0]?.source, "mesh");
    assert.equal(rows[0]?.uid, `openmeshtak-member-${memberId}`);
    assert.equal(rows[0]?.userId, memberUserId);
    assert.equal(rows[0]?.ce, 365);
    assert.equal(rows[0]?.meshHqName, "HQ North");
    assert.equal(rows[1]?.uid, "meshtastic-00001234");
    assert.equal(rows[1]?.userId, null);

    const historian = await createUser("Historian", [{ permission: "tak-traffic.history", eventId }]);
    const range = `from=${encodeURIComponent(minutesAgo(60))}&to=${encodeURIComponent(new Date(Date.now() + 60_000).toISOString())}`;
    const history = (await request(app).get(`/api/v1/events/${eventId}/tak-traffic/history?${range}`).set("Cookie", historian.cookie).expect(200)).body as {
      tracks: Array<{ uid: string; sender: { userId: string } | null; segments: Array<Array<{ source: string; mesh?: { nodeId: string } }>> }>;
    };
    const unbound = history.tracks.find(({ uid }) => uid === "meshtastic-00001234");
    assert.equal(unbound?.sender, null);
    assert.equal(unbound?.segments[0]?.[0]?.source, "mesh");
    assert.equal(unbound?.segments[0]?.[0]?.mesh?.nodeId, "!00001234");
  });

  void it("keeps positions out of the recording while the event does not record", async () => {
    const response = await upload([position(50)]).expect(200);
    assert.equal((response.body as { recorded: number }).recorded, 0);
    assert.equal(await database.takTrafficItem.count({ where: { eventId } }), 0);
  });
});
