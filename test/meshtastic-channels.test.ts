import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, beforeEach, describe, it } from "node:test";
import type { Express } from "express";
import request from "supertest";
import { createApp } from "../src/app.js";
import { PERMISSIONS } from "../src/shared/auth/permissions.js";
import { database, disconnectDatabase } from "../src/shared/database/database.js";
import { clearDatabase, createEvent, createUser, type TestUser } from "./support/identity.js";

interface ProblemBody {
  code?: string;
  errors?: Array<{ field: string; code: string }>;
}

interface ChannelBody {
  id: string;
  name: string;
  sortOrder: number;
  primary: boolean;
  psk: { kind: string; version: number; rotatedAt: string | null };
  audience: { groupIds: string[]; roleIds: string[]; memberIds: string[] };
  version: number;
}

let app: Express;
let admin: TestUser;
let eventId: string;
let groupId: string;

function channels(path = ""): string {
  return `/api/v1/events/${eventId}/meshtastic/channels${path}`;
}

function createChannel(body: Record<string, unknown>): request.Test {
  return request(app).post(channels()).set("Cookie", admin.cookie).send(body);
}

void describe("Meshtastic channels", () => {
  beforeEach(async () => {
    await clearDatabase();
    app = createApp();
    admin = await createUser("Admin", PERMISSIONS.map((permission) => ({ permission })));
    eventId = await createEvent();
    groupId = randomUUID();
    await database.eventGroup.create({
      data: { id: groupId, eventId, name: "Bravo", slug: "bravo" },
    });
  });

  after(async () => {
    await clearDatabase();
    await disconnectDatabase();
  });

  void it("creates channels in order with generated keys that never appear in responses", async () => {
    const primary = (await createChannel({ name: "Event" }).expect(201)).body as ChannelBody;
    const bravo = (
      await createChannel({ name: "Bravo", audience: { groupIds: [groupId], roleIds: [], memberIds: [] } })
        .expect(201)
    ).body as ChannelBody;

    assert.equal(primary.primary, true);
    assert.equal(primary.sortOrder, 0);
    assert.deepEqual(primary.psk, { kind: "aes256", version: 1, rotatedAt: null });
    assert.equal(bravo.primary, false);
    assert.equal(bravo.sortOrder, 1);
    assert.deepEqual(bravo.audience.groupIds, [groupId]);

    const stored = await database.meshtasticChannel.findUniqueOrThrow({ where: { id: primary.id } });
    assert.match(stored.pskEnvelope, /^v1\./);

    const list = await request(app).get(channels()).set("Cookie", admin.cookie).expect(200);
    assert.equal(JSON.stringify(list.body).includes(stored.pskEnvelope), false);
    assert.equal("pskEnvelope" in (list.body as { items: object[] }).items[0]!, false);
  });

  void it("accepts explicit keys and rejects invalid ones", async () => {
    const psk = Buffer.alloc(16, 7).toString("base64");
    const created = (await createChannel({ name: "Custom", psk }).expect(201)).body as ChannelBody;
    assert.equal(created.psk.kind, "aes128");

    const revealed = await request(app)
      .post(channels(`/${created.id}/psk/reveal`))
      .set("Cookie", admin.cookie)
      .expect(200);
    assert.deepEqual(revealed.body, { kind: "aes128", version: 1, psk });

    for (const invalid of ["not base64!", Buffer.alloc(8).toString("base64")]) {
      const response = await createChannel({ name: "Bad", psk: invalid }).expect(422);
      assert.equal((response.body as ProblemBody).errors?.[0]?.code, "INVALID_PSK");
    }
  });

  void it("rejects audience entries of other events, duplicate names and a ninth channel", async () => {
    const otherEvent = await createEvent();
    const foreignGroup = randomUUID();
    await database.eventGroup.create({
      data: { id: foreignGroup, eventId: otherEvent, name: "Other", slug: "other" },
    });

    const foreign = await createChannel({
      name: "Foreign",
      audience: { groupIds: [foreignGroup], roleIds: [], memberIds: [] },
    }).expect(422);
    assert.equal((foreign.body as ProblemBody).errors?.[0]?.field, "audience.groupIds");

    for (let index = 0; index < 7; index += 1) {
      await createChannel({ name: `ch${String(index)}` }).expect(201);
    }
    assert.equal(((await createChannel({ name: "ch0" })).body as ProblemBody).code, "CHANNEL_NAME_CONFLICT");
    await createChannel({ name: "ch7" }).expect(201);
    const ninth = await createChannel({ name: "ninth" }).expect(409);
    assert.equal((ninth.body as ProblemBody).code, "CHANNEL_LIMIT_REACHED");
  });

  void it("moves the primary role with the sort order and replaces the audience on update", async () => {
    const first = (await createChannel({ name: "First" }).expect(201)).body as ChannelBody;
    const second = (await createChannel({ name: "Second" }).expect(201)).body as ChannelBody;

    const updated = await request(app)
      .put(channels(`/${second.id}`))
      .set("Cookie", admin.cookie)
      .send({
        version: second.version,
        name: "Second",
        sortOrder: 0,
        uplinkEnabled: true,
        downlinkEnabled: false,
        positionPrecision: 13,
        audience: { groupIds: [groupId], roleIds: [], memberIds: [] },
      })
      .expect(200);
    assert.equal((updated.body as ChannelBody).primary, false);

    await request(app)
      .put(channels(`/${first.id}`))
      .set("Cookie", admin.cookie)
      .send({
        version: first.version,
        name: "First",
        sortOrder: 5,
        uplinkEnabled: false,
        downlinkEnabled: false,
        positionPrecision: 0,
        audience: { groupIds: [], roleIds: [], memberIds: [] },
      })
      .expect(200);

    const reread = await request(app).get(channels(`/${second.id}`)).set("Cookie", admin.cookie).expect(200);
    assert.equal((reread.body as ChannelBody).primary, true);

    const stale = await request(app)
      .put(channels(`/${second.id}`))
      .set("Cookie", admin.cookie)
      .send({
        version: second.version,
        name: "Second",
        sortOrder: 0,
        uplinkEnabled: false,
        downlinkEnabled: false,
        positionPrecision: 0,
        audience: { groupIds: [], roleIds: [], memberIds: [] },
      })
      .expect(409);
    assert.equal((stale.body as ProblemBody).code, "VERSION_CONFLICT");
  });

  void it("rotates keys and audits rotation and reveal without key material", async () => {
    const channel = (await createChannel({ name: "Event" }).expect(201)).body as ChannelBody;
    const before = await request(app)
      .post(channels(`/${channel.id}/psk/reveal`))
      .set("Cookie", admin.cookie)
      .expect(200);

    const rotated = await request(app)
      .post(channels(`/${channel.id}/psk/rotate`))
      .set("Cookie", admin.cookie)
      .send({ version: channel.version })
      .expect(200);
    assert.equal((rotated.body as ChannelBody).psk.version, 2);
    assert.notEqual((rotated.body as ChannelBody).psk.rotatedAt, null);

    const afterRotation = await request(app)
      .post(channels(`/${channel.id}/psk/reveal`))
      .set("Cookie", admin.cookie)
      .expect(200);
    assert.notEqual((afterRotation.body as { psk: string }).psk, (before.body as { psk: string }).psk);

    const audits = await database.auditEvent.findMany({
      where: { targetId: channel.id },
    });
    assert.deepEqual(
      audits.map(({ action }) => action).sort(),
      [
        "meshtastic-channel.created",
        "meshtastic-channel.psk-revealed",
        "meshtastic-channel.psk-revealed",
        "meshtastic-channel.psk-rotated",
      ],
    );
    const serialized = JSON.stringify(audits);
    for (const psk of [before.body, afterRotation.body] as Array<{ psk: string }>) {
      assert.equal(serialized.includes(psk.psk), false);
    }
  });

  void it("requires channel-keys.reveal to read a key", async () => {
    const channel = (await createChannel({ name: "Event" }).expect(201)).body as ChannelBody;
    const manager = await createUser("Manager", [
      { permission: "events.read", eventId },
      { permission: "events.manage", eventId },
    ]);

    await request(app).get(channels(`/${channel.id}`)).set("Cookie", manager.cookie).expect(200);
    const denied = await request(app)
      .post(channels(`/${channel.id}/psk/reveal`))
      .set("Cookie", manager.cookie)
      .expect(403);
    assert.equal((denied.body as ProblemBody).code, "FORBIDDEN");

    const outsider = await createUser("Outsider", []);
    await request(app).post(channels(`/${channel.id}/psk/reveal`)).set("Cookie", outsider.cookie).expect(404);
  });

  void it("drops a deleted group from channel audiences", async () => {
    const channel = (
      await createChannel({ name: "Bravo", audience: { groupIds: [groupId], roleIds: [], memberIds: [] } })
        .expect(201)
    ).body as ChannelBody;

    await request(app).delete(`/api/v1/events/${eventId}/groups/${groupId}`).set("Cookie", admin.cookie).expect(204);
    const reread = await request(app).get(channels(`/${channel.id}`)).set("Cookie", admin.cookie).expect(200);
    assert.deepEqual((reread.body as ChannelBody).audience.groupIds, []);
  });
});
