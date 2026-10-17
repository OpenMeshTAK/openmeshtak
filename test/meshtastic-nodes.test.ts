import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, beforeEach, describe, it } from "node:test";
import type { Express } from "express";
import request from "supertest";
import { createApp } from "../src/app.js";
import { cotRouter, type LiveMeshItem } from "../src/modules/tak-server/streaming/cot-router.js";
import { database, disconnectDatabase } from "../src/shared/database/database.js";
import { clearDatabase, createEvent, createUser } from "./support/identity.js";

const NODE = 0xa1b2c3d4;

function meshPosition(eventId: string, uid: string, nodeId: string, memberId: string | null, userId: string | null): LiveMeshItem {
  const time = new Date();
  return {
    item: { uid, type: memberId === null ? "a-u-G" : "a-f-G-U-C", callsign: uid, lat: 52.5, lon: 13.4, course: null, speed: null, time, stale: new Date(time.getTime() + 600_000) },
    eventId,
    userId,
    mesh: {
      nodeId,
      shortName: null,
      longName: null,
      memberId,
      hqId: "hq-1",
      hqName: null,
      receivedAt: time,
      batteryLevel: null,
      snr: null,
      rssi: null,
      hopsAway: null,
      channel: null,
    },
  };
}

void describe("Meshtastic node bindings", () => {
  let app: Express;
  let eventId: string;
  let memberId: string;
  let otherMemberId: string;

  beforeEach(async () => {
    await clearDatabase();
    app = createApp();
    eventId = await createEvent();
    const roleId = randomUUID();
    const groupId = randomUUID();
    await database.eventRole.create({ data: { id: roleId, eventId, name: "Participant", slug: "participant" } });
    await database.eventGroup.create({ data: { id: groupId, eventId, name: "Bravo", slug: "bravo", shortNamePrefix: "B" } });
    const peter = await createUser("Peter", []);
    const anna = await createUser("Anna", []);
    memberId = randomUUID();
    otherMemberId = randomUUID();
    await database.eventMember.create({
      data: { id: memberId, eventId, userId: peter.id, eventRoleId: roleId, eventGroupId: groupId, username: "Peter", callsign: "Peter [Bravo]", shortNameNumber: 1 },
    });
    await database.eventMember.create({
      data: { id: otherMemberId, eventId, userId: anna.id, eventRoleId: roleId, eventGroupId: groupId, username: "Anna", callsign: "Anna [Bravo]", shortNameNumber: 2 },
    });
    await database.meshtasticNode.create({ data: { id: randomUUID(), eventId, nodeId: "!a1b2c3d4", shortName: "b1", longName: " Peter [Bravo] " } });
    await database.meshtasticNode.create({ data: { id: randomUUID(), eventId, nodeId: "!0000beef", shortName: "B2", longName: "Someone else" } });
  });

  after(async () => {
    await clearDatabase();
    await disconnectDatabase();
  });

  void it("suggests members whose provisioned short name and callsign both match", async () => {
    const reader = await createUser("Reader", [
      { permission: "members.read", eventId },
      { permission: "events.read", eventId },
    ]);
    const page = (await request(app).get(`/api/v1/events/${eventId}/meshtastic-nodes`).set("Cookie", reader.cookie).expect(200)).body as {
      items: Array<{ nodeNum: number; nodeId: string; suggestion: { memberId: string; shortName: string } | null; binding: unknown }>;
    };
    assert.deepEqual(
      page.items.map(({ nodeId, suggestion }) => [nodeId, suggestion?.memberId ?? null]),
      [
        ["!a1b2c3d4", memberId],
        ["!0000beef", null],
      ],
    );
    assert.equal(page.items[0]?.nodeNum, NODE);
    assert.equal(page.items[0]?.suggestion?.shortName, "B1");
    await request(app).put(`/api/v1/events/${eventId}/meshtastic-nodes/${String(NODE)}/binding`).set("Cookie", reader.cookie).send({ memberId, version: 1 }).expect(403);
  });

  void it("binds, changes and removes bindings with versions and one node per member", async () => {
    const operator = await createUser("Operator", [
      { permission: "mesh-bindings.manage", eventId },
      { permission: "events.read", eventId },
    ]);
    const bind = (nodeNum: number, body: { memberId: string; version: number }) =>
      request(app).put(`/api/v1/events/${eventId}/meshtastic-nodes/${String(nodeNum)}/binding`).set("Cookie", operator.cookie).send(body);

    const bound = (await bind(NODE, { memberId, version: 1 }).expect(200)).body as { binding: { member: { memberId: string } }; version: number; suggestion: unknown };
    assert.equal(bound.binding.member.memberId, memberId);
    assert.equal(bound.suggestion, null);
    await bind(NODE, { memberId: otherMemberId, version: 1 }).expect(409);
    assert.equal(((await bind(0xbeef, { memberId, version: 1 }).expect(409)).body as { code: string }).code, "MESHTASTIC_MEMBER_BOUND");
    await bind(NODE, { memberId: otherMemberId, version: bound.version }).expect(200);
    // A radio can be bound before any HQ heard it.
    const advance = (await bind(0x42, { memberId, version: 0 }).expect(200)).body as { nodeId: string; lastHeardAt: string | null };
    assert.equal(advance.nodeId, "!00000042");
    assert.equal(advance.lastHeardAt, null);
    await bind(0x43, { memberId: randomUUID(), version: 0 }).expect(422);

    await request(app).delete(`/api/v1/events/${eventId}/meshtastic-nodes/${String(NODE)}/binding`).set("Cookie", operator.cookie).expect(204);
    await request(app).delete(`/api/v1/events/${eventId}/meshtastic-nodes/${String(NODE)}/binding`).set("Cookie", operator.cookie).expect(404);
    const actions = (await database.auditEvent.findMany({ where: { targetType: "meshtastic-node" }, orderBy: { occurredAt: "asc" } })).map(({ action }) => action);
    assert.deepEqual(actions, ["meshtastic-node.bound", "meshtastic-node.bound", "meshtastic-node.bound", "meshtastic-node.unbound"]);
  });

  void it("removes the node's live position under its previous identity when the binding changes", async () => {
    const operator = await createUser("Operator", [
      { permission: "mesh-bindings.manage", eventId },
      { permission: "events.read", eventId },
    ]);
    const binding = `/api/v1/events/${eventId}/meshtastic-nodes/${String(NODE)}/binding`;
    const liveUids = (): string[] => cotRouter.snapshot(eventId).meshItems.map(({ item }) => item.uid);
    const peter = (await database.eventMember.findUniqueOrThrow({ where: { id: memberId } })).userId;
    let changes = 0;
    const unsubscribe = cotRouter.onChange((eventIds) => {
      if (eventIds.has(eventId)) changes += 1;
    });
    try {
      cotRouter.rememberMesh(meshPosition(eventId, "meshtastic-a1b2c3d4", "!a1b2c3d4", null, null));
      cotRouter.rememberMesh(meshPosition(eventId, "meshtastic-0000beef", "!0000beef", null, null));
      changes = 0;

      const bound = (await request(app).put(binding).set("Cookie", operator.cookie).send({ memberId, version: 1 }).expect(200)).body as { version: number };
      assert.deepEqual(liveUids(), ["meshtastic-0000beef"]);
      assert.equal(changes, 1, "viewers are told the unbound position is gone");

      cotRouter.rememberMesh(meshPosition(eventId, "peter-device", "!a1b2c3d4", memberId, peter));
      await request(app).put(binding).set("Cookie", operator.cookie).send({ memberId, version: bound.version }).expect(200);
      assert.deepEqual(liveUids(), ["meshtastic-0000beef", "peter-device"], "binding the same member again keeps the position");

      await request(app).delete(binding).set("Cookie", operator.cookie).expect(204);
      assert.deepEqual(liveUids(), ["meshtastic-0000beef"]);
    } finally {
      unsubscribe();
      cotRouter.forgetMeshNode(eventId, "!0000beef");
    }
  });
});
