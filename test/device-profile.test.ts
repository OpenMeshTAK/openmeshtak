import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, beforeEach, describe, it } from "node:test";
import { fromBinary } from "@bufbuild/protobuf";
import { AppOnly, ClientOnly } from "@meshtastic/protobufs";
import type { Express } from "express";
import request from "supertest";
import { createApp } from "../src/app.js";
import { PERMISSIONS } from "../src/shared/auth/permissions.js";
import { database, disconnectDatabase } from "../src/shared/database/database.js";
import { clearDatabase, createEvent, createUser, type TestUser } from "./support/identity.js";

const none = { groupIds: [], roleIds: [], memberIds: [] };
const commandKey = Buffer.alloc(32, 7);

let app: Express;
let admin: TestUser;
let holder: TestUser;
let member: TestUser;
let eventId: string;
let holderMemberId: string;
let memberId: string;

function deviceProfileUrl(id: string): string {
  return `/api/v1/events/${eventId}/members/${id}/meshtastic/device-profile`;
}

async function download(user: TestUser, id: string) {
  const response = await request(app)
    .get(deviceProfileUrl(id))
    .set("Cookie", user.cookie)
    .buffer(true)
    .parse((res, callback) => {
      const chunks: Buffer[] = [];
      res.on("data", (chunk: Buffer) => chunks.push(chunk));
      res.on("end", () => callback(null, Buffer.concat(chunks)));
    })
    .expect(200);
  return {
    disposition: String(response.headers["content-disposition"]),
    profile: fromBinary(ClientOnly.DeviceProfileSchema, response.body as Buffer),
  };
}

function channelNames(channelUrl: string | undefined): string[] {
  if (channelUrl === undefined) {
    return [];
  }
  const fragment = channelUrl.slice(channelUrl.indexOf("#") + 1);
  return fromBinary(AppOnly.ChannelSetSchema, Buffer.from(fragment, "base64url")).settings.map(({ name }) => name);
}

void describe("Meshtastic device profiles", () => {
  beforeEach(async () => {
    await clearDatabase();
    app = createApp();
    admin = await createUser("Admin", PERMISSIONS.map((permission) => ({ permission })));
    holder = await createUser("Leader", []);
    member = await createUser("Peter", []);
    eventId = await createEvent();

    const roleId = randomUUID();
    const groupId = randomUUID();
    holderMemberId = randomUUID();
    memberId = randomUUID();
    await database.eventRole.create({ data: { id: roleId, eventId, name: "Participant", slug: "participant" } });
    await database.eventGroup.create({
      data: { id: groupId, eventId, name: "Bravo", slug: "bravo", shortNamePrefix: "B" },
    });
    await database.eventMember.createMany({
      data: [
        { id: holderMemberId, eventId, userId: holder.id, eventRoleId: roleId, eventGroupId: groupId, username: "Leader", callsign: "Leader [Bravo]", shortNameNumber: 1 },
        { id: memberId, eventId, userId: member.id, eventRoleId: roleId, eventGroupId: groupId, username: "Peter", callsign: "Peter [Bravo]", shortNameNumber: 2 },
      ],
    });

    const channels = `/api/v1/events/${eventId}/meshtastic/channels`;
    await request(app).post(channels).set("Cookie", admin.cookie).send({ name: "Event" }).expect(201);
    await request(app)
      .post(channels)
      .set("Cookie", admin.cookie)
      .send({ name: "Bravo", audience: { ...none, groupIds: [groupId] } })
      .expect(201);
    await request(app)
      .post(channels)
      .set("Cookie", admin.cookie)
      .send({
        name: "Command",
        psk: commandKey.toString("base64"),
        secret: true,
        audience: { ...none, groupIds: [groupId] },
        keyHolders: { ...none, memberIds: [holderMemberId] },
      })
      .expect(201);
    await request(app)
      .put(`/api/v1/events/${eventId}/meshtastic/configuration/settings`)
      .set("Cookie", admin.cookie)
      .send({ version: 0, settings: { "config.lora.hopLimit": 5, "config.lora.region": "EU_868", "config.device.role": "TAK" } })
      .expect(200);
    await request(app).post(`/api/v1/events/${eventId}/activate`).set("Cookie", admin.cookie).send({ version: 1 }).expect(200);
  });

  after(async () => {
    await clearDatabase();
    await disconnectDatabase();
  });

  void it("encodes identity, published settings and the member's channels as a DeviceProfile", async () => {
    const { disposition, profile } = await download(member, memberId);

    assert.equal(disposition, 'attachment; filename="Peter-Bravo-fw2.8.cfg"');
    assert.equal(profile.longName, "Peter [Bravo]");
    assert.equal(profile.shortName, "B2");
    assert.equal(profile.config?.lora?.hopLimit, 5);
    assert.equal(profile.config?.lora?.usePreset, true);
    assert.equal(profile.config?.device?.role, 7, "TAK role");
    assert.equal(profile.config?.security?.privateKey.length, 0, "never a device private key");
    assert.deepEqual(channelNames(profile.channelUrl), ["Event", "Bravo"]);
  });

  void it("includes a withheld secret channel only for its key holder and audits that handout", async () => {
    const { profile } = await download(holder, holderMemberId);
    assert.deepEqual(channelNames(profile.channelUrl), ["Event", "Bravo", "Command"]);

    const actions = (await database.auditEvent.findMany({ where: { action: { startsWith: "meshtastic" } } })).map(
      ({ action }) => action,
    );
    assert.ok(actions.includes("meshtastic.device-profile-generated"));
    assert.ok(actions.includes("meshtastic-channel.handout-delivered"));
    const audits = JSON.stringify(await database.auditEvent.findMany());
    assert.equal(audits.includes(commandKey.toString("base64")), false);
  });

  void it("serves the file only to the member themself", async () => {
    await request(app).get(deviceProfileUrl(memberId)).set("Cookie", holder.cookie).expect(404);
    await request(app).get(deviceProfileUrl(memberId)).set("Cookie", admin.cookie).expect(404);
    await request(app).get(deviceProfileUrl(memberId)).expect(401);
  });
});
