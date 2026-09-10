import assert from "node:assert/strict";
import { after, beforeEach, describe, it } from "node:test";
import type { Express } from "express";
import request from "supertest";
import { createApp } from "../src/app.js";
import { PERMISSIONS } from "../src/shared/auth/permissions.js";
import { database, disconnectDatabase } from "../src/shared/database/database.js";
import {
  clearDatabase,
  createEvent,
  createServiceAccountKey,
  createUser,
  type TestUser,
} from "./support/identity.js";

interface ProblemBody {
  code?: string;
}

interface MemberBody {
  id: string;
  userId: string;
  eventRole: { id: string };
  eventGroup: { id: string };
}

let app: Express;
let admin: TestUser;
let eventId: string;
let member: MemberBody;

async function createAssignment(kind: "roles" | "groups", slug: string): Promise<void> {
  await request(app)
    .post(`/api/v1/events/${eventId}/${kind}`)
    .set("Cookie", admin.cookie)
    .send({ name: slug, slug })
    .expect(201);
}

void describe("event members", () => {
  beforeEach(async () => {
    await clearDatabase();
    app = createApp();
    admin = await createUser("Admin", PERMISSIONS.map((permission) => ({ permission })));
    eventId = await createEvent();
    await createAssignment("roles", "participant");
    await createAssignment("groups", "bravo");

    const key = await createServiceAccountKey([{ permission: "members.sync", eventId }]);
    const response = await request(app)
      .put(`/api/v1/events/${eventId}/external-members/discord/123456789`)
      .set("Authorization", `Bearer ${key}`)
      .send({ username: "Peter", eventRole: "participant", group: "bravo" })
      .expect(200);
    member = (response.body as { member: MemberBody }).member;
  });

  after(async () => {
    await clearDatabase();
    await disconnectDatabase();
  });

  void it("lists and reads members with members.read", async () => {
    const reader = await createServiceAccountKey([{ permission: "members.read", eventId }]);

    const list = await request(app)
      .get(`/api/v1/events/${eventId}/members`)
      .set("Authorization", `Bearer ${reader}`)
      .expect(200);
    assert.deepEqual(
      (list.body as { items: MemberBody[] }).items.map(({ id }) => id),
      [member.id],
    );

    await request(app)
      .get(`/api/v1/events/${eventId}/members/${member.id}`)
      .set("Authorization", `Bearer ${reader}`)
      .expect(200);
  });

  void it("conceals members of other events", async () => {
    const otherEvent = await createEvent();
    const outsider = await createServiceAccountKey([{ permission: "members.read", eventId: otherEvent }]);

    await request(app)
      .get(`/api/v1/events/${eventId}/members`)
      .set("Authorization", `Bearer ${outsider}`)
      .expect(404);
    await request(app)
      .get(`/api/v1/events/${otherEvent}/members/${member.id}`)
      .set("Authorization", `Bearer ${outsider}`)
      .expect(404);
  });

  void it("removes only the event participation and audits it", async () => {
    await request(app)
      .delete(`/api/v1/events/${eventId}/members/${member.id}`)
      .set("Cookie", admin.cookie)
      .expect(204);

    assert.equal(await database.eventMember.count(), 0);
    assert.ok(await database.domainUser.findUnique({ where: { id: member.userId } }));
    assert.equal(await database.externalIdentity.count(), 1);
    assert.equal(await database.auditEvent.count({ where: { action: "event-member.deleted" } }), 1);
  });

  void it("protects assigned roles and groups from deletion", async () => {
    for (const [kind, id, code] of [
      ["roles", member.eventRole.id, "ROLE_IN_USE"],
      ["groups", member.eventGroup.id, "GROUP_IN_USE"],
    ] as const) {
      const response = await request(app)
        .delete(`/api/v1/events/${eventId}/${kind}/${id}`)
        .set("Cookie", admin.cookie)
        .expect(409);
      assert.equal((response.body as ProblemBody).code, code);
    }

    await request(app)
      .delete(`/api/v1/events/${eventId}/members/${member.id}`)
      .set("Cookie", admin.cookie)
      .expect(204);
    await request(app)
      .delete(`/api/v1/events/${eventId}/roles/${member.eventRole.id}`)
      .set("Cookie", admin.cookie)
      .expect(204);
  });

  void it("requires members.manage to remove members and rejects archived events", async () => {
    const reader = await createUser("Reader", [{ permission: "members.read", eventId }]);
    await request(app)
      .delete(`/api/v1/events/${eventId}/members/${member.id}`)
      .set("Cookie", reader.cookie)
      .expect(403);

    await database.event.update({ where: { id: eventId }, data: { status: "archived" } });
    const response = await request(app)
      .delete(`/api/v1/events/${eventId}/members/${member.id}`)
      .set("Cookie", admin.cookie)
      .expect(409);
    assert.equal((response.body as ProblemBody).code, "EVENT_ARCHIVED");
  });
});
