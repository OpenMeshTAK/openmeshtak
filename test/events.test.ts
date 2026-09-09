import assert from "node:assert/strict";
import { after, beforeEach, describe, it } from "node:test";
import type { Express } from "express";
import request from "supertest";
import { createApp } from "../src/app.js";
import { PERMISSIONS } from "../src/shared/auth/permissions.js";
import { database, disconnectDatabase } from "../src/shared/database/database.js";
import {
  clearDatabase,
  createServiceAccountKey,
  createUser,
  type TestUser,
} from "./support/identity.js";

interface ProblemBody {
  code?: string;
  currentVersion?: number;
  errors?: Array<{ field: string; code: string }>;
}

interface EventBody {
  id: string;
  slug: string;
  timeZone: string;
  status: string;
  version: number;
  startsAt: string | null;
}

interface PageBody<T> {
  items: T[];
  page: { nextCursor: string | null; hasMore: boolean };
}

let app: Express;
let admin: TestUser;

async function createEvent(slug: string, extra: Record<string, unknown> = {}): Promise<EventBody> {
  const response = await request(app)
    .post("/api/v1/events")
    .set("Cookie", admin.cookie)
    .send({ name: `Event ${slug}`, slug, timeZone: "Europe/Berlin", ...extra })
    .expect(201);
  return response.body as EventBody;
}

function updateBody(event: EventBody, changes: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    version: event.version,
    name: "Renamed",
    slug: event.slug,
    timeZone: event.timeZone,
    startsAt: null,
    endsAt: null,
    ...changes,
  };
}

void describe("events", () => {
  beforeEach(async () => {
    await clearDatabase();
    app = createApp();
    admin = await createUser("Admin", PERMISSIONS.map((permission) => ({ permission })));
  });

  after(async () => {
    await clearDatabase();
    await disconnectDatabase();
  });

  void it("creates draft events with a canonical IANA time zone and audits them", async () => {
    const event = await createEvent("lightsim-2027", {
      timeZone: "europe/berlin",
      startsAt: "2027-05-01T10:00:00+02:00",
    });

    assert.equal(event.status, "draft");
    assert.equal(event.version, 1);
    assert.equal(event.timeZone, "Europe/Berlin");
    assert.equal(event.startsAt, "2027-05-01T08:00:00.000Z");

    const audit = await database.auditEvent.findFirstOrThrow({ where: { action: "event.created" } });
    assert.equal(audit.targetId, event.id);
    assert.equal(audit.actorId, admin.id);
  });

  void it("rejects fixed offsets, reversed schedules, bad slugs and client-chosen states", async () => {
    const invalid = await request(app)
      .post("/api/v1/events")
      .set("Cookie", admin.cookie)
      .send({
        name: "Invalid",
        slug: "invalid",
        timeZone: "+01:00",
        startsAt: "2027-05-02T00:00:00Z",
        endsAt: "2027-05-01T00:00:00Z",
      })
      .expect(422);
    assert.deepEqual(
      (invalid.body as ProblemBody).errors?.map(({ code }) => code),
      ["INVALID_TIME_ZONE", "BEFORE_START"],
    );

    for (const body of [
      { name: "Bad slug", slug: "Light Sim", timeZone: "UTC" },
      { name: "Bad slug", slug: "double--hyphen", timeZone: "UTC" },
      { name: "Active", slug: "active", timeZone: "UTC", status: "active" },
    ]) {
      await request(app).post("/api/v1/events").set("Cookie", admin.cookie).send(body).expect(422);
    }
    assert.equal(await database.event.count(), 0);
  });

  void it("keeps slugs unique", async () => {
    await createEvent("lightsim-2027");
    const response = await request(app)
      .post("/api/v1/events")
      .set("Cookie", admin.cookie)
      .send({ name: "Duplicate", slug: "lightsim-2027", timeZone: "UTC" })
      .expect(409);
    assert.equal((response.body as ProblemBody).code, "SLUG_CONFLICT");
  });

  void it("updates with optimistic concurrency", async () => {
    const event = await createEvent("lightsim-2027");

    const updated = await request(app)
      .put(`/api/v1/events/${event.id}`)
      .set("Cookie", admin.cookie)
      .send(updateBody(event))
      .expect(200);
    assert.equal((updated.body as EventBody).version, 2);

    const stale = await request(app)
      .put(`/api/v1/events/${event.id}`)
      .set("Cookie", admin.cookie)
      .send(updateBody(event))
      .expect(409);
    assert.equal((stale.body as ProblemBody).code, "VERSION_CONFLICT");
    assert.equal((stale.body as ProblemBody).currentVersion, 2);
  });

  void it("treats archived events as read-only", async () => {
    const event = await createEvent("lightsim-2026");
    await database.event.update({ where: { id: event.id }, data: { status: "archived" } });

    await request(app).get(`/api/v1/events/${event.id}`).set("Cookie", admin.cookie).expect(200);
    const response = await request(app)
      .put(`/api/v1/events/${event.id}`)
      .set("Cookie", admin.cookie)
      .send(updateBody(event))
      .expect(409);
    assert.equal((response.body as ProblemBody).code, "EVENT_ARCHIVED");
  });

  void it("limits event-scoped users to their events and conceals others", async () => {
    const visible = await createEvent("visible");
    const hidden = await createEvent("hidden");
    const viewer = await createUser("Viewer", [{ permission: "events.read", eventId: visible.id }]);

    const list = await request(app).get("/api/v1/events").set("Cookie", viewer.cookie).expect(200);
    assert.deepEqual(
      (list.body as PageBody<EventBody>).items.map(({ id }) => id),
      [visible.id],
    );

    await request(app).get(`/api/v1/events/${visible.id}`).set("Cookie", viewer.cookie).expect(200);
    await request(app).get(`/api/v1/events/${hidden.id}`).set("Cookie", viewer.cookie).expect(404);
    await request(app)
      .put(`/api/v1/events/${visible.id}`)
      .set("Cookie", viewer.cookie)
      .send(updateBody(visible))
      .expect(403);
    await request(app)
      .post("/api/v1/events")
      .set("Cookie", viewer.cookie)
      .send({ name: "New", slug: "new", timeZone: "UTC" })
      .expect(403);
  });

  void it("lets an event-scoped manager edit only that event and not create events", async () => {
    const managed = await createEvent("managed");
    const other = await createEvent("other");
    const manager = await createUser("Manager", [
      { permission: "events.read", eventId: managed.id },
      { permission: "events.manage", eventId: managed.id },
    ]);

    await request(app)
      .put(`/api/v1/events/${managed.id}`)
      .set("Cookie", manager.cookie)
      .send(updateBody(managed))
      .expect(200);
    await request(app)
      .put(`/api/v1/events/${other.id}`)
      .set("Cookie", manager.cookie)
      .send(updateBody(other))
      .expect(404);
    await request(app)
      .post("/api/v1/events")
      .set("Cookie", manager.cookie)
      .send({ name: "New", slug: "new", timeZone: "UTC" })
      .expect(403);
  });

  void it("serves scoped integrations through API keys", async () => {
    const visible = await createEvent("visible");
    await createEvent("hidden");
    const key = await createServiceAccountKey([{ permission: "events.read", eventId: visible.id }]);

    const list = await request(app)
      .get("/api/v1/events")
      .set("Authorization", `Bearer ${key}`)
      .expect(200);
    assert.deepEqual(
      (list.body as PageBody<EventBody>).items.map(({ id }) => id),
      [visible.id],
    );
  });

  void it("filters by an allowlisted status", async () => {
    const draft = await createEvent("draft-event");
    const active = await createEvent("active-event");
    await database.event.update({ where: { id: active.id }, data: { status: "active" } });

    const response = await request(app)
      .get("/api/v1/events?status=draft")
      .set("Cookie", admin.cookie)
      .expect(200);
    assert.deepEqual(
      (response.body as PageBody<EventBody>).items.map(({ id }) => id),
      [draft.id],
    );

    await request(app).get("/api/v1/events?status=locked").set("Cookie", admin.cookie).expect(422);
  });

  void it("denies unauthenticated access", async () => {
    await request(app).get("/api/v1/events").expect(401);
  });
});
