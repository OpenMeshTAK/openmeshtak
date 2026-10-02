import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, beforeEach, describe, it } from "node:test";
import type { Express } from "express";
import request from "supertest";
import { createApp } from "../src/app.js";
import { PERMISSIONS } from "../src/shared/auth/permissions.js";
import { database, disconnectDatabase } from "../src/shared/database/database.js";
import { clearDatabase, createEvent, createUser, type TestUser } from "./support/identity.js";

interface Overview {
  memberCount: number;
  openSyncIssueCount: number;
  publishedRevision: number | null;
  unpublishedChanges: boolean;
}

let app: Express;
let admin: TestUser;
let eventId: string;

function url(path = ""): string {
  return `/api/v1/events/${eventId}${path}`;
}

async function overview(): Promise<Overview> {
  const response = await request(app).get("/api/v1/events").set("Cookie", admin.cookie).expect(200);
  const items = (response.body as { items: Array<{ id: string; overview: Overview }> }).items;
  const item = items.find(({ id }) => id === eventId);
  assert.ok(item, "the event is listed");
  return item.overview;
}

void describe("event overview", () => {
  beforeEach(async () => {
    await clearDatabase();
    app = createApp();
    admin = await createUser("Admin", PERMISSIONS.map((permission) => ({ permission })));
    eventId = await createEvent();
    const role = (await request(app).post(url("/roles")).set("Cookie", admin.cookie).send({ name: "Participant", slug: "participant" }).expect(201))
      .body as { id: string };
    const group = (await request(app).post(url("/groups")).set("Cookie", admin.cookie).send({ name: "Bravo", slug: "bravo" }).expect(201))
      .body as { id: string };
    const peter = await createUser("Peter", []);
    await database.eventMember.create({
      data: { id: randomUUID(), eventId, userId: peter.id, eventRoleId: role.id, eventGroupId: group.id, username: "Peter", callsign: "Peter", shortNameNumber: 1 },
    });
  });

  after(async () => {
    await clearDatabase();
    await disconnectDatabase();
  });

  void it("counts members and open sync issues", async () => {
    const issue = { eventId, provider: "discord", username: "Unknown", requestedRole: "medic", requestedGroup: "bravo", reasons: [] };
    await database.syncIssue.create({ data: { id: randomUUID(), externalId: "1", ...issue } });
    await database.syncIssue.create({ data: { id: randomUUID(), externalId: "2", status: "resolved", resolvedAt: new Date(), ...issue } });

    assert.deepEqual(await overview(), { memberCount: 1, openSyncIssueCount: 1, publishedRevision: null, unpublishedChanges: false });
  });

  void it("reports configuration changes that participants do not see until published", async () => {
    await request(app).post(url("/activate")).set("Cookie", admin.cookie).send({ version: 1 }).expect(200);
    assert.deepEqual(await overview(), { memberCount: 1, openSyncIssueCount: 0, publishedRevision: 1, unpublishedChanges: false });

    await request(app).post(url("/roles")).set("Cookie", admin.cookie).send({ name: "Medic", slug: "medic" }).expect(201);
    const changed = await overview();
    assert.deepEqual([changed.publishedRevision, changed.unpublishedChanges], [1, true]);

    await request(app).post(url("/configuration-revisions")).set("Cookie", admin.cookie).expect(200);
    const published = await overview();
    assert.deepEqual([published.publishedRevision, published.unpublishedChanges], [2, false]);
  });
});
