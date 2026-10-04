import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, beforeEach, describe, it } from "node:test";
import type { Express } from "express";
import request from "supertest";
import { createApp } from "../src/app.js";
import { PERMISSIONS } from "../src/shared/auth/permissions.js";
import { database, disconnectDatabase } from "../src/shared/database/database.js";
import { clearDatabase, createEvent, createApiClientKey, createUser, type TestUser } from "./support/identity.js";

interface HandoutBody {
  channelId: string;
  channelName: string;
  primary: boolean;
  pskVersion: number;
  url: string;
}

const none = { groupIds: [], roleIds: [], memberIds: [] };

let app: Express;
let admin: TestUser;
let holder: TestUser;
let otherMember: TestUser;
let eventId: string;
let holderMemberId: string;
let otherMemberId: string;
let channelId: string;

function handout(memberId: string, selectedChannelId = channelId): string {
  return `/api/v1/events/${eventId}/members/${memberId}/meshtastic/channels/${selectedChannelId}/handout`;
}

void describe("secret Meshtastic channel handouts", () => {
  beforeEach(async () => {
    await clearDatabase();
    app = createApp();
    admin = await createUser("Admin", PERMISSIONS.map((permission) => ({ permission })));
    holder = await createUser("Leader", []);
    otherMember = await createUser("Member", []);
    eventId = await createEvent();

    const roleId = randomUUID();
    const groupId = randomUUID();
    holderMemberId = randomUUID();
    otherMemberId = randomUUID();
    await database.eventRole.create({
      data: { id: roleId, eventId, name: "Participant", slug: "participant" },
    });
    await database.eventGroup.create({
      data: { id: groupId, eventId, name: "Bravo", slug: "bravo", shortNamePrefix: "B" },
    });
    await database.eventMember.createMany({
      data: [
        {
          id: holderMemberId,
          eventId,
          userId: holder.id,
          eventRoleId: roleId,
          eventGroupId: groupId,
          username: "Leader",
          callsign: "Leader",
          shortNameNumber: 1,
        },
        {
          id: otherMemberId,
          eventId,
          userId: otherMember.id,
          eventRoleId: roleId,
          eventGroupId: groupId,
          username: "Member",
          callsign: "Member",
          shortNameNumber: 2,
        },
      ],
    });

    await request(app)
      .post(`/api/v1/events/${eventId}/meshtastic/channels`)
      .set("Cookie", admin.cookie)
      .send({ name: "Event" })
      .expect(201);
    const created = await request(app)
      .post(`/api/v1/events/${eventId}/meshtastic/channels`)
      .set("Cookie", admin.cookie)
      .send({
        name: "Command",
        psk: Buffer.alloc(32, 7).toString("base64"),
        secret: true,
        audience: { ...none, groupIds: [groupId] },
        keyHolders: { ...none, memberIds: [holderMemberId] },
        uplinkEnabled: true,
        positionPrecision: 13,
      })
      .expect(201);
    channelId = (created.body as { id: string }).id;

    await request(app)
      .post(`/api/v1/events/${eventId}/activate`)
      .set("Cookie", admin.cookie)
      .send({ version: 1 })
      .expect(200);
  });

  after(async () => {
    await clearDatabase();
    await disconnectDatabase();
  });

  void it("delivers and audits a channel URL only for the signed-in key holder", async () => {
    const delivered = await request(app).get(handout(holderMemberId)).set("Cookie", holder.cookie).expect(200);
    const body = delivered.body as HandoutBody;
    assert.equal(body.channelId, channelId);
    assert.equal(body.channelName, "Command");
    assert.equal(body.primary, false);
    assert.equal(body.pskVersion, 1);
    assert.match(body.url, /^https:\/\/meshtastic\.org\/e\/\?add=true#[-_A-Za-z0-9]+$/);
    assert.equal(delivered.headers["cache-control"], "no-store");

    await request(app).get(handout(otherMemberId)).set("Cookie", otherMember.cookie).expect(404);
    await request(app).get(handout(holderMemberId)).set("Cookie", admin.cookie).expect(404);
    const apiKey = await createApiClientKey([{ permission: "members.read", eventId }]);
    await request(app)
      .get(handout(holderMemberId))
      .set("Authorization", `Bearer ${apiKey}`)
      .expect(401);

    const audit = await database.auditEvent.findFirstOrThrow({
      where: { action: "meshtastic-channel.handout-delivered", targetId: channelId },
    });
    assert.equal(audit.actorId, holder.id);
    assert.equal(JSON.stringify(audit).includes(body.url), false);
  });

  void it("uses the latest rotated key without republishing the configuration", async () => {
    const first = (await request(app).get(handout(holderMemberId)).set("Cookie", holder.cookie).expect(200))
      .body as HandoutBody;
    const channel = await request(app)
      .get(`/api/v1/events/${eventId}/meshtastic/channels/${channelId}`)
      .set("Cookie", admin.cookie)
      .expect(200);
    await request(app)
      .post(`/api/v1/events/${eventId}/meshtastic/channels/${channelId}/psk/rotate`)
      .set("Cookie", admin.cookie)
      .send({ version: (channel.body as { version: number }).version })
      .expect(200);

    const rotated = (await request(app).get(handout(holderMemberId)).set("Cookie", holder.cookie).expect(200))
      .body as HandoutBody;
    assert.equal(rotated.pskVersion, 2);
    assert.notEqual(rotated.url, first.url);
  });
});
