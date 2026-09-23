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
    assert.equal(profile.moduleConfig?.tak?.team, 10, "Cyan from the group");
    assert.equal(profile.moduleConfig?.tak?.role, 1, "Team Member from the group");
  });

  void it("refuses callsigns longer than a device profile allows", async () => {
    await database.eventMember.update({ where: { id: memberId }, data: { callsign: "Peter with a very long callsign" } });
    const response = await request(app).get(deviceProfileUrl(memberId)).set("Cookie", member.cookie).expect(409);
    assert.equal((response.body as { code: string }).code, "DEVICE_PROFILE_VALUE_UNSUPPORTED");
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

  void it("serves the file only to the member themself or an on-behalf operator", async () => {
    const reader = await createUser("Reader", [{ permission: "members.read", eventId }]);
    const otherEvent = await createEvent();
    const foreign = await createUser("Foreign", [{ permission: "member-artifacts.download", eventId: otherEvent }]);
    for (const user of [holder, reader, foreign]) {
      await request(app).get(deviceProfileUrl(memberId)).set("Cookie", user.cookie).expect(404);
    }
    await request(app).get(deviceProfileUrl(memberId)).expect(401);
  });

  void it("gives an on-behalf operator exactly the member's own file and audits it", async () => {
    const operator = await createUser("Operator", [{ permission: "member-artifacts.download", eventId }]);

    const own = await download(member, memberId);
    const onBehalf = await download(operator, memberId);
    assert.deepEqual(onBehalf.profile, own.profile);
    assert.deepEqual(channelNames(onBehalf.profile.channelUrl), ["Event", "Bravo"], "no secret the member lacks");

    const forHolder = await download(operator, holderMemberId);
    assert.deepEqual(channelNames(forHolder.profile.channelUrl), ["Event", "Bravo", "Command"], "the key holder's file");

    const audits = await database.auditEvent.findMany({
      where: { actorId: operator.id, action: "meshtastic.device-profile-generated" },
    });
    assert.deepEqual(audits.map(({ targetId }) => targetId).sort(), [holderMemberId, memberId].sort());
    assert.ok(audits.every(({ metadata }) => (metadata as { onBehalf: boolean }).onBehalf));
  });

  void it("lets an on-behalf operator open the member's settings and audits the view", async () => {
    const operator = await createUser("Operator", [{ permission: "member-artifacts.download", eventId }]);
    const response = await request(app)
      .get(`/api/v1/events/${eventId}/members/${memberId}/profile`)
      .set("Cookie", operator.cookie)
      .expect(200);
    assert.equal((response.body as { meshtastic: { shortName: string } }).meshtastic.shortName, "B2");
    const audit = await database.auditEvent.findFirstOrThrow({ where: { action: "member-profile.viewed-on-behalf" } });
    assert.equal(audit.actorId, operator.id);
    assert.equal(audit.targetId, memberId);

    await request(app).get(`/api/v1/events/${eventId}/members/${memberId}/profile`).set("Cookie", member.cookie).expect(200);
    assert.equal(await database.auditEvent.count({ where: { action: "member-profile.viewed-on-behalf" } }), 1);
  });

  void it("refuses on-behalf downloads outside active events", async () => {
    const operator = await createUser("Operator", [{ permission: "member-artifacts.download", eventId }]);
    await database.event.update({ where: { id: eventId }, data: { status: "archived" } });
    await request(app).get(deviceProfileUrl(memberId)).set("Cookie", operator.cookie).expect(404);
  });
});
