import assert from "node:assert/strict";
import { after, beforeEach, describe, it } from "node:test";
import type { Express } from "express";
import request from "supertest";
import { createApp } from "../src/app.js";
import { recordAudit } from "../src/shared/audit/audit.js";
import { disconnectDatabase } from "../src/shared/database/database.js";
import { clearDatabase, createEvent, createUser, type TestUser } from "./support/identity.js";

interface AuditEventPage {
  items: Array<{ action: string; eventId: string | null; eventName: string | null; actor: { type: string; name: string | null } }>;
  page: { nextCursor: string | null; hasMore: boolean };
}

let app: Express;
let admin: TestUser;
let eventId: string;
let otherEventId: string;

async function list(user: TestUser, path: string): Promise<AuditEventPage> {
  return (await request(app).get(path).set("Cookie", user.cookie).expect(200)).body as AuditEventPage;
}

void describe("audit log", () => {
  beforeEach(async () => {
    await clearDatabase();
    app = createApp();
    admin = await createUser("Admin", [{ permission: "audit.read" }]);
    eventId = await createEvent();
    otherEventId = await createEvent();
    // Oldest first; the list returns newest first.
    await recordAudit({ actor: { type: "user", id: admin.id }, action: "user.updated", targetType: "user", targetId: admin.id, result: "success" });
    await recordAudit({ actor: { type: "system" }, action: "event.activated", targetType: "event", targetId: eventId, result: "success" });
    await recordAudit({
      actor: { type: "system" },
      action: "event-group.created",
      targetType: "event-group",
      targetId: "group",
      result: "success",
      metadata: { eventId },
    });
    await recordAudit({ actor: { type: "system" }, action: "event.archived", targetType: "event", targetId: otherEventId, result: "failure" });
  });

  after(async () => {
    await clearDatabase();
    await disconnectDatabase();
  });

  void it("lists every entry newest first with actor and event names, in pages", async () => {
    const first = await list(admin, "/api/v1/audit-events?limit=3");
    assert.deepEqual(
      first.items.map(({ action }) => action),
      ["event.archived", "event-group.created", "event.activated"],
    );
    assert.equal(first.items[1]?.eventName, "Test event");
    assert.ok(first.page.nextCursor !== null);

    const second = await list(admin, `/api/v1/audit-events?limit=3&cursor=${first.page.nextCursor}`);
    assert.deepEqual(second.items.map(({ action }) => action), ["user.updated"]);
    assert.equal(second.items[0]?.actor.name, "Admin");
    assert.equal(second.page.hasMore, false);
  });

  void it("filters by event, by installation scope, by result and by text", async () => {
    const event = await list(admin, `/api/v1/audit-events?eventId=${eventId}`);
    assert.deepEqual(event.items.map(({ action }) => action), ["event-group.created", "event.activated"]);
    const instance = await list(admin, "/api/v1/audit-events?scope=instance");
    assert.deepEqual(instance.items.map(({ action }) => action), ["user.updated"]);
    const failures = await list(admin, "/api/v1/audit-events?result=failure");
    assert.deepEqual(failures.items.map(({ action }) => action), ["event.archived"]);
    const search = await list(admin, "/api/v1/audit-events?search=group");
    assert.deepEqual(search.items.map(({ action }) => action), ["event-group.created"]);

    await request(app).get(`/api/v1/audit-events?scope=instance&eventId=${eventId}`).set("Cookie", admin.cookie).expect(422);
  });

  void it("gives event-scoped readers only their event's entries", async () => {
    const operator = await createUser("Operator", [{ permission: "audit.read", eventId }]);

    const page = await list(operator, `/api/v1/events/${eventId}/audit-events`);
    assert.deepEqual(page.items.map(({ action }) => action), ["event-group.created", "event.activated"]);

    await request(app).get("/api/v1/audit-events").set("Cookie", operator.cookie).expect(403);
    await request(app).get(`/api/v1/events/${otherEventId}/audit-events`).set("Cookie", operator.cookie).expect(404);
  });
});
