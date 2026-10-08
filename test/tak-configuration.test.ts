import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, beforeEach, describe, it } from "node:test";
import type { Express } from "express";
import request from "supertest";
import { createApp } from "../src/app.js";
import { PERMISSIONS } from "../src/shared/auth/permissions.js";
import { database, disconnectDatabase } from "../src/shared/database/database.js";
import { clearDatabase, createEvent, createUser, type TestUser } from "./support/identity.js";
import { enableTakServer } from "./support/tak.js";

interface ProfileBody {
  tak: {
    server: { hostName: string | null; streamingPort: number };
    meshtasticLocalServer: { meshChannel: { name: string; slot: number } | null } | null;
  };
}

const none = { groupIds: [], roleIds: [], memberIds: [] };

let app: Express;
let admin: TestUser;
let eventId: string;
let bravoId: string;
let bravoMemberId: string;
let charlieMemberId: string;

function url(path = ""): string {
  return `/api/v1/events/${eventId}${path}`;
}

async function createChannel(name: string, groupIds: string[]): Promise<string> {
  const response = await request(app)
    .post(url("/meshtastic/channels"))
    .set("Cookie", admin.cookie)
    .send({ name, audience: { ...none, groupIds } })
    .expect(201);
  return (response.body as { id: string }).id;
}

async function tak(memberId: string): Promise<ProfileBody["tak"]> {
  const response = await request(app).get(url(`/members/${memberId}/profile`)).set("Cookie", admin.cookie).expect(200);
  return (response.body as ProfileBody).tak;
}

void describe("TAK configuration", () => {
  beforeEach(async () => {
    await clearDatabase();
    app = createApp();
    admin = await createUser("Admin", PERMISSIONS.map((permission) => ({ permission })));
    eventId = await createEvent();
    const roleId = randomUUID();
    bravoId = randomUUID();
    const charlieId = randomUUID();
    bravoMemberId = randomUUID();
    charlieMemberId = randomUUID();
    await database.eventRole.create({ data: { id: roleId, eventId, name: "Participant", slug: "participant" } });
    await database.eventGroup.createMany({
      data: [
        { id: bravoId, eventId, name: "Bravo", slug: "bravo", shortNamePrefix: "B" },
        { id: charlieId, eventId, name: "Charlie", slug: "charlie", shortNamePrefix: "C" },
      ],
    });
    const bravoUser = await createUser("Peter", []);
    const charlieUser = await createUser("Anna", []);
    await database.eventMember.createMany({
      data: [
        { id: bravoMemberId, eventId, userId: bravoUser.id, eventRoleId: roleId, eventGroupId: bravoId, username: "Peter", callsign: "Peter", shortNameNumber: 1 },
        { id: charlieMemberId, eventId, userId: charlieUser.id, eventRoleId: roleId, eventGroupId: charlieId, username: "Anna", callsign: "Anna", shortNameNumber: 1 },
      ],
    });
  });

  after(async () => {
    await clearDatabase();
    await disconnectDatabase();
  });

  void it("connects members of Meshtastic events to the TAK server and the Meshtastic app", async () => {
    const configuration = await request(app).get(url("/tak/configuration")).set("Cookie", admin.cookie).expect(200);
    assert.deepEqual(configuration.body, { eventId, meshChannelId: null, version: 0, updatedAt: null });
    assert.deepEqual(await tak(bravoMemberId), {
      ...(await tak(bravoMemberId)),
      server: { hostName: null, streamingPort: 8089 },
      meshtasticLocalServer: { meshChannel: null },
    });

    await enableTakServer(app, admin);
    assert.deepEqual((await tak(bravoMemberId)).server, { hostName: "tak.example.org", streamingPort: 8089 });
  });

  void it("translates the chosen mesh channel into each member's device slot", async () => {
    await createChannel("Event", []);
    const takChannel = await createChannel("TAK", [bravoId]);

    await request(app)
      .put(url("/tak/configuration"))
      .set("Cookie", admin.cookie)
      .send({ version: 0, meshChannelId: takChannel })
      .expect(200);

    assert.deepEqual((await tak(bravoMemberId)).meshtasticLocalServer, { meshChannel: { name: "TAK", slot: 1 } });
    // Charlie does not receive the TAK channel, so the app falls back to the primary channel.
    assert.deepEqual((await tak(charlieMemberId)).meshtasticLocalServer, { meshChannel: null });
  });

  void it("leaves the Meshtastic app out of TAK-only events", async () => {
    await createChannel("Event", []);
    await database.event.update({ where: { id: eventId }, data: { meshtasticEnabled: false } });
    const profile = await tak(bravoMemberId);
    assert.equal(profile.meshtasticLocalServer, null);
    assert.deepEqual(profile.server, { hostName: null, streamingPort: 8089 });
  });

  void it("rejects channels of other events and stale versions", async () => {
    const response = await request(app)
      .put(url("/tak/configuration"))
      .set("Cookie", admin.cookie)
      .send({ version: 0, meshChannelId: randomUUID() })
      .expect(422);
    assert.equal((response.body as { errors: Array<{ field: string }> }).errors[0]?.field, "meshChannelId");

    await request(app)
      .put(url("/tak/configuration"))
      .set("Cookie", admin.cookie)
      .send({ version: 0, meshChannelId: null })
      .expect(200);
    await request(app)
      .put(url("/tak/configuration"))
      .set("Cookie", admin.cookie)
      .send({ version: 0, meshChannelId: null })
      .expect(409);
  });
});
