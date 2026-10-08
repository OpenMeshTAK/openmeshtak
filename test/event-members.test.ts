import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, beforeEach, describe, it } from "node:test";
import type { Express } from "express";
import request from "supertest";
import { createApp } from "../src/app.js";
import { PERMISSIONS } from "../src/shared/auth/permissions.js";
import { database, disconnectDatabase } from "../src/shared/database/database.js";
import {
  clearDatabase,
  createEvent,
  createApiClientKey,
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

    const key = await createApiClientKey([{ permission: "members.sync", eventId }]);
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
    const reader = await createApiClientKey([{ permission: "members.read", eventId }]);

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

  void it("counts the TAK apps that may still connect", async () => {
    const certificate = (suffix: string, notAfter: Date, revokedAt: Date | null = null) => ({
      id: randomUUID(),
      userId: member.userId,
      caId: randomUUID(),
      serialNumber: `serial-${suffix}`,
      fingerprintSha256: `fingerprint-${suffix}`,
      commonName: "Peter",
      notBefore: new Date(Date.now() - 86_400_000),
      notAfter,
      revokedAt,
    });
    const later = new Date(Date.now() + 86_400_000);
    await database.takClientCertificate.createMany({
      data: [
        certificate("valid", later),
        certificate("revoked", later, new Date()),
        certificate("expired", new Date(Date.now() - 1000)),
      ],
    });

    const read = await request(app).get(`/api/v1/events/${eventId}/members/${member.id}`).set("Cookie", admin.cookie).expect(200);
    assert.equal((read.body as { enrolledTakApps: number }).enrolledTakApps, 1);
  });

  void it("conceals members of other events", async () => {
    const otherEvent = await createEvent();
    const outsider = await createApiClientKey([{ permission: "members.read", eventId: otherEvent }]);

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

  void it("reassigns the group, renumbers the short name and keeps a callsign override", async () => {
    await request(app)
      .post(`/api/v1/events/${eventId}/groups`)
      .set("Cookie", admin.cookie)
      .send({ name: "Charlie", slug: "charlie" })
      .expect(201);
    const groups = await database.eventGroup.findMany({ where: { eventId }, select: { id: true, slug: true } });
    const charlie = groups.find(({ slug }) => slug === "charlie");
    assert.ok(charlie);

    const response = await request(app)
      .put(`/api/v1/events/${eventId}/members/${member.id}`)
      .set("Cookie", admin.cookie)
      .send({ version: 1, eventRoleId: member.eventRole.id, eventGroupId: charlie.id, callsignOverride: "  Pete  " })
      .expect(200);
    const updated = response.body as MemberBody & { callsign: string; callsignOverride: string; shortName: string; version: number };
    assert.equal(updated.eventGroup.id, charlie.id);
    assert.equal(updated.callsign, "Pete");
    assert.equal(updated.callsignOverride, "Pete");
    assert.equal(updated.shortName, "C1");
    assert.equal(updated.version, 2);
    assert.equal(await database.auditEvent.count({ where: { action: "event-member.updated" } }), 1);

    const cleared = await request(app)
      .put(`/api/v1/events/${eventId}/members/${member.id}`)
      .set("Cookie", admin.cookie)
      .send({ version: 2, eventRoleId: member.eventRole.id, eventGroupId: charlie.id, callsignOverride: null })
      .expect(200);
    assert.equal((cleared.body as { callsign: string }).callsign, "Peter");
  });

  void it("rejects stale versions, foreign assignments and taken callsigns", async () => {
    const base = { eventRoleId: member.eventRole.id, eventGroupId: member.eventGroup.id, callsignOverride: null };
    const stale = await request(app)
      .put(`/api/v1/events/${eventId}/members/${member.id}`)
      .set("Cookie", admin.cookie)
      .send({ ...base, version: 7 })
      .expect(409);
    assert.equal((stale.body as ProblemBody).code, "VERSION_CONFLICT");

    const otherEvent = await createEvent();
    const foreign = await request(app)
      .post(`/api/v1/events/${otherEvent}/groups`)
      .set("Cookie", admin.cookie)
      .send({ name: "Bravo", slug: "bravo" })
      .expect(201);
    const invalid = await request(app)
      .put(`/api/v1/events/${eventId}/members/${member.id}`)
      .set("Cookie", admin.cookie)
      .send({ ...base, version: 1, eventGroupId: (foreign.body as { id: string }).id })
      .expect(422);
    assert.equal((invalid.body as ProblemBody).code, "VALIDATION_FAILED");

    const key = await createApiClientKey([{ permission: "members.sync", eventId }]);
    await request(app)
      .put(`/api/v1/events/${eventId}/external-members/discord/987654321`)
      .set("Authorization", `Bearer ${key}`)
      .send({ username: "Anna", eventRole: "participant", group: "bravo" })
      .expect(200);
    const taken = await request(app)
      .put(`/api/v1/events/${eventId}/members/${member.id}`)
      .set("Cookie", admin.cookie)
      .send({ ...base, version: 1, callsignOverride: "Anna" })
      .expect(409);
    assert.equal((taken.body as ProblemBody).code, "MEMBER_IDENTITY_CONFLICT");
  });

  void it("adds an existing user without an external identity", async () => {
    const local = await createUser("Anna", []);
    const response = await request(app)
      .post(`/api/v1/events/${eventId}/members`)
      .set("Cookie", admin.cookie)
      .send({ userId: local.id, eventRoleId: member.eventRole.id, eventGroupId: member.eventGroup.id })
      .expect(201);
    const created = response.body as MemberBody & { callsign: string; shortName: string };
    assert.equal(created.userId, local.id);
    assert.equal(created.callsign, "Anna");
    assert.equal(created.shortName, "B2");
    assert.equal(await database.externalIdentity.count(), 1);
    assert.equal(await database.auditEvent.count({ where: { action: "event-member.created", targetId: created.id } }), 1);

    const again = await request(app)
      .post(`/api/v1/events/${eventId}/members`)
      .set("Cookie", admin.cookie)
      .send({ userId: local.id, eventRoleId: member.eventRole.id, eventGroupId: member.eventGroup.id })
      .expect(409);
    assert.equal((again.body as ProblemBody).code, "MEMBER_EXISTS");
  });

  void it("rejects unknown users, taken callsigns and callers without members.manage", async () => {
    const assignment = { eventRoleId: member.eventRole.id, eventGroupId: member.eventGroup.id };
    const unknown = await request(app)
      .post(`/api/v1/events/${eventId}/members`)
      .set("Cookie", admin.cookie)
      .send({ ...assignment, userId: "00000000-0000-4000-8000-000000000000" })
      .expect(422);
    assert.equal((unknown.body as ProblemBody).code, "VALIDATION_FAILED");

    const namesake = await createUser("Peter", []);
    const taken = await request(app)
      .post(`/api/v1/events/${eventId}/members`)
      .set("Cookie", admin.cookie)
      .send({ ...assignment, userId: namesake.id })
      .expect(409);
    assert.equal((taken.body as ProblemBody).code, "MEMBER_IDENTITY_CONFLICT");
    await request(app)
      .post(`/api/v1/events/${eventId}/members`)
      .set("Cookie", admin.cookie)
      .send({ ...assignment, userId: namesake.id, callsignOverride: "Peter 2" })
      .expect(201);

    const reader = await createUser("Reader", [{ permission: "members.read", eventId }]);
    await request(app)
      .post(`/api/v1/events/${eventId}/members`)
      .set("Cookie", reader.cookie)
      .send({ ...assignment, userId: reader.id })
      .expect(403);
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
