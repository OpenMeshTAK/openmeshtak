import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, beforeEach, describe, it } from "node:test";
import type { Express } from "express";
import request from "supertest";
import { createApp } from "../src/app.js";
import { PERMISSIONS } from "../src/shared/auth/permissions.js";
import { database, disconnectDatabase } from "../src/shared/database/database.js";
import { clearDatabase, createEvent, createUser, type TestUser } from "./support/identity.js";

let app: Express;
let admin: TestUser;
let eventId: string;
let groupId: string;
let memberIds: string[];

function reorder(ids: string[], user = admin): request.Test {
  return request(app).put(`/api/v1/events/${eventId}/groups/${groupId}/member-order`).set("Cookie", user.cookie).send({ memberIds: ids });
}

void describe("group member order", () => {
  beforeEach(async () => {
    await clearDatabase();
    app = createApp();
    admin = await createUser("Admin", PERMISSIONS.map((permission) => ({ permission })));
    eventId = await createEvent();
    const roleId = randomUUID();
    groupId = randomUUID();
    await database.eventRole.create({ data: { id: roleId, eventId, name: "Participant", slug: "participant" } });
    await database.eventGroup.create({ data: { id: groupId, eventId, name: "Bravo", slug: "bravo", shortNamePrefix: "B" } });
    memberIds = [];
    for (const [index, name] of ["Anna", "Ben", "Carl"].entries()) {
      const user = await createUser(name, []);
      const id = randomUUID();
      memberIds.push(id);
      await database.eventMember.create({
        data: { id, eventId, userId: user.id, eventRoleId: roleId, eventGroupId: groupId, username: name, callsign: name, shortNameNumber: index + 1 },
      });
    }
  });

  after(async () => {
    await clearDatabase();
    await disconnectDatabase();
  });

  void it("moves B3 to the front and the resolved profiles show the new numbers", async () => {
    const [anna, ben, carl] = memberIds as [string, string, string];
    const ordered = (await reorder([carl, anna, ben]).expect(200)).body as Array<{ id: string; shortName: string }>;
    assert.deepEqual(ordered.map(({ id, shortName }) => [id, shortName]), [[carl, "B1"], [anna, "B2"], [ben, "B3"]]);

    const profile = await request(app).get(`/api/v1/events/${eventId}/members/${carl}/profile`).set("Cookie", admin.cookie).expect(200);
    assert.equal((profile.body as { meshtastic: { shortName: string } }).meshtastic.shortName, "B1");
    assert.equal(await database.auditEvent.count({ where: { action: "event-group.members-renumbered" } }), 1);
  });

  void it("refuses stale or incomplete orders and callers without members.manage", async () => {
    const [anna, ben, carl] = memberIds as [string, string, string];
    for (const ids of [[anna, ben], [anna, ben, carl, randomUUID()], [anna, anna, ben]]) {
      const response = await reorder(ids).expect(409);
      assert.equal((response.body as { code: string }).code, "STALE_MEMBER_ORDER");
    }
    const reader = await createUser("Reader", [{ permission: "members.read", eventId }]);
    await reorder([carl, anna, ben], reader).expect(403);
  });
});
