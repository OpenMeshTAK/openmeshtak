import assert from "node:assert/strict";
import { after, beforeEach, describe, it } from "node:test";
import type { Express } from "express";
import request from "supertest";
import { createApp } from "../src/app.js";
import { PERMISSIONS } from "../src/shared/auth/permissions.js";
import { database, disconnectDatabase } from "../src/shared/database/database.js";
import { clearDatabase, createApiClientKey, createEvent, createUser, type TestUser } from "./support/identity.js";

interface UserBody {
  id: string;
  accountEvent: { id: string } | null;
}

interface CreatedAccountBody {
  member: { id: string; userId: string; callsign: string };
  user: UserBody;
  setupLink: { url: string };
}

let app: Express;
let admin: TestUser;
let eventId: string;
let assignment: { eventRoleId: string; eventGroupId: string };

async function addRoleAndGroup(event: string): Promise<{ eventRoleId: string; eventGroupId: string }> {
  const ids: string[] = [];
  for (const kind of ["roles", "groups"]) {
    const response = await request(app)
      .post(`/api/v1/events/${event}/${kind}`)
      .set("Cookie", admin.cookie)
      .send({ name: "Default", slug: "default" })
      .expect(201);
    ids.push((response.body as { id: string }).id);
  }
  return { eventRoleId: ids[0] ?? "", eventGroupId: ids[1] ?? "" };
}

function createAccount(displayName: string, cookie = admin.cookie, event = eventId, ids = assignment): request.Test {
  return request(app).post(`/api/v1/events/${event}/members/accounts`).set("Cookie", cookie).send({ displayName, ...ids });
}

async function archive(event: string): Promise<void> {
  await database.event.update({ where: { id: event }, data: { status: "active" } });
  await request(app).post(`/api/v1/events/${event}/archive`).set("Cookie", admin.cookie).send({ version: 1 }).expect(200);
}

void describe("event accounts", () => {
  beforeEach(async () => {
    await clearDatabase();
    app = createApp();
    admin = await createUser("Admin", PERMISSIONS.map((permission) => ({ permission })));
    eventId = await createEvent();
    assignment = await addRoleAndGroup(eventId);
  });

  after(async () => {
    await clearDatabase();
    await disconnectDatabase();
  });

  void it("creates a member with a new event account and needs member-accounts.create", async () => {
    const organizer = await createUser("Organizer", [{ permission: "member-accounts.create", eventId }]);
    const created = (await createAccount("Peter Müller", organizer.cookie).expect(201)).body as CreatedAccountBody;

    assert.equal(created.user.accountEvent?.id, eventId);
    assert.equal(created.member.userId, created.user.id);
    assert.match(created.setupLink.url, /\/activate#omtk_setup_/);

    const outsider = await createUser("Outsider", [{ permission: "users.create" }]);
    await createAccount("Nope", outsider.cookie).expect(403);
  });

  void it("creates permanent accounts when the event keeps its accounts", async () => {
    await database.event.update({ where: { id: eventId }, data: { permanentAccounts: true } });
    const created = (await createAccount("Peter").expect(201)).body as CreatedAccountBody;
    assert.equal(created.user.accountEvent, null);

    const key = await createApiClientKey([{ permission: "members.sync", eventId }]);
    const synced = await request(app)
      .put(`/api/v1/events/${eventId}/external-members/discord/42`)
      .set("Authorization", `Bearer ${key}`)
      .send({ username: "Synced", eventRole: "default", group: "default" })
      .expect(200);
    const user = await database.domainUser.findUniqueOrThrow({
      where: { id: (synced.body as { member: { userId: string } }).member.userId },
    });
    assert.equal(user.accountEventId, null);
  });

  void it("deletes event accounts on archive, keeps permanent ones and moves shared ones", async () => {
    const temporary = (await createAccount("Temporary").expect(201)).body as CreatedAccountBody;
    const shared = (await createAccount("Shared").expect(201)).body as CreatedAccountBody;
    const kept = (await createAccount("Kept").expect(201)).body as CreatedAccountBody;
    await request(app).post(`/api/v1/users/${kept.user.id}/make-permanent`).set("Cookie", admin.cookie).expect(200);

    const otherEvent = await createEvent();
    const otherAssignment = await addRoleAndGroup(otherEvent);
    await request(app)
      .post(`/api/v1/events/${otherEvent}/members`)
      .set("Cookie", admin.cookie)
      .send({ userId: shared.user.id, ...otherAssignment })
      .expect(201);

    await archive(eventId);

    assert.equal(await database.domainUser.count({ where: { id: temporary.user.id } }), 0);
    assert.equal(await database.user.count({ where: { username: "temporary" } }), 0);
    assert.equal((await database.domainUser.findUniqueOrThrow({ where: { id: shared.user.id } })).accountEventId, otherEvent);
    assert.equal((await database.domainUser.findUniqueOrThrow({ where: { id: kept.user.id } })).accountEventId, null);

    const audit = await database.auditEvent.findFirstOrThrow({ where: { action: "event.archived" } });
    assert.deepEqual(audit.metadata, { previousStatus: "active", status: "archived", deletedAccounts: 1, movedAccounts: 1 });
  });

  void it("needs event-accounts.manage to change whether the event keeps its accounts", async () => {
    const manager = await createUser("Manager", [{ permission: "events.manage", eventId }, { permission: "events.read", eventId }]);
    const body = { version: 1, name: "Test event", slug: "kept", timeZone: "Europe/Berlin", startsAt: null, endsAt: null };
    await request(app).put(`/api/v1/events/${eventId}`).set("Cookie", manager.cookie).send({ ...body, permanentAccounts: true }).expect(403);
    await request(app).put(`/api/v1/events/${eventId}`).set("Cookie", manager.cookie).send({ ...body, permanentAccounts: false }).expect(200);
    await request(app)
      .put(`/api/v1/events/${eventId}`)
      .set("Cookie", admin.cookie)
      .send({ ...body, version: 2, permanentAccounts: true })
      .expect(200);
  });

  void it("makes every event account of an event permanent and filters by account type", async () => {
    await createAccount("One").expect(201);
    await createAccount("Two").expect(201);

    const reader = await createUser("Reader", [{ permission: "users.read" }]);
    await request(app).post(`/api/v1/events/${eventId}/make-accounts-permanent`).set("Cookie", reader.cookie).expect(403);

    const events = await request(app)
      .get("/api/v1/users?accountType=event")
      .set("Cookie", admin.cookie)
      .expect(200);
    assert.equal((events.body as { items: UserBody[] }).items.length, 2);

    const made = await request(app)
      .post(`/api/v1/events/${eventId}/make-accounts-permanent`)
      .set("Cookie", admin.cookie)
      .expect(200);
    assert.deepEqual(made.body, { accounts: 2 });

    const after = await request(app).get("/api/v1/users?accountType=event").set("Cookie", admin.cookie).expect(200);
    assert.equal((after.body as { items: UserBody[] }).items.length, 0);
  });
});
