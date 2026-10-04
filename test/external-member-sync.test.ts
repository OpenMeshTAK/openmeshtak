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
  createApiClientKey,
  createUser,
  type TestUser,
} from "./support/identity.js";

interface ProblemBody {
  code?: string;
}

interface SyncBody {
  outcome: "member" | "sync-issue";
  change?: string;
  member?: {
    id: string;
    userId: string;
    displayName: string;
    eventRole: { slug: string };
    eventGroup: { slug: string };
    version: number;
  };
  syncIssue?: {
    id: string;
    status: string;
    occurrences: number;
    reasons: Array<{ field: string; code: string }>;
  };
}

let app: Express;
let admin: TestUser;
let eventId: string;
let botKey: string;

async function addSlugs(kind: "roles" | "groups", ...slugs: string[]): Promise<void> {
  for (const slug of slugs) {
    await request(app)
      .post(`/api/v1/events/${eventId}/${kind}`)
      .set("Cookie", admin.cookie)
      .send({ name: slug, slug })
      .expect(201);
  }
}

function sync(
  externalId: string,
  body: Record<string, unknown>,
  key = botKey,
  provider = "discord",
): request.Test {
  return request(app)
    .put(`/api/v1/events/${eventId}/external-members/${provider}/${externalId}`)
    .set("Authorization", `Bearer ${key}`)
    .send(body);
}

const peter = { username: "Peter", eventRole: "participant", group: "bravo" };

void describe("external member synchronization", () => {
  beforeEach(async () => {
    await clearDatabase();
    app = createApp();
    admin = await createUser("Admin", PERMISSIONS.map((permission) => ({ permission })));
    eventId = await createEvent();
    botKey = await createApiClientKey([{ permission: "members.sync", eventId }]);
    await addSlugs("roles", "participant", "lead");
    await addSlugs("groups", "bravo", "alpha");
  });

  after(async () => {
    await clearDatabase();
    await disconnectDatabase();
  });

  void it("creates Peter in Bravo without any authentication side effects", async () => {
    const authCounts = async (): Promise<number[]> =>
      Promise.all([database.user.count(), database.account.count(), database.session.count()]);
    const before = await authCounts();

    const body = (await sync("123456789", peter).expect(200)).body as SyncBody;

    assert.equal(body.outcome, "member");
    assert.equal(body.change, "created");
    assert.equal(body.member?.displayName, "Peter");
    assert.equal(body.member?.eventRole.slug, "participant");
    assert.equal(body.member?.eventGroup.slug, "bravo");
    assert.deepEqual(await authCounts(), before);

    const identity = await database.externalIdentity.findUniqueOrThrow({
      where: { provider_externalId: { provider: "discord", externalId: "123456789" } },
      include: { user: true },
    });
    assert.equal(identity.user.authSubjectId, null);
    assert.equal(identity.userId, body.member?.userId);
  });

  void it("is idempotent and updates assignments in place", async () => {
    const first = (await sync("123456789", peter).expect(200)).body as SyncBody;
    const repeated = (await sync("123456789", peter).expect(200)).body as SyncBody;
    assert.equal(repeated.change, "unchanged");
    assert.equal(repeated.member?.id, first.member?.id);

    const moved = (await sync("123456789", { ...peter, group: "alpha" }).expect(200)).body as SyncBody;
    assert.equal(moved.change, "updated");
    assert.equal(moved.member?.eventGroup.slug, "alpha");
    assert.equal(moved.member?.version, 2);

    assert.equal(await database.eventMember.count(), 1);
    assert.equal(await database.domainUser.count({ where: { authSubjectId: null } }), 1);
  });

  void it("reuses one user for the same identity across events", async () => {
    const first = (await sync("123456789", peter).expect(200)).body as SyncBody;

    const secondEvent = eventId;
    eventId = await createEvent();
    await addSlugs("roles", "participant");
    await addSlugs("groups", "bravo");
    const key = await createApiClientKey([{ permission: "members.sync", eventId }]);
    const second = (await sync("123456789", peter, key).expect(200)).body as SyncBody;

    assert.notEqual(eventId, secondEvent);
    assert.equal(second.member?.userId, first.member?.userId);
  });

  void it("records one visible sync issue for unknown slugs and changes nothing else", async () => {
    const first = (await sync("555", { ...peter, eventRole: "medic", group: "charlie" }).expect(200))
      .body as SyncBody;
    assert.equal(first.outcome, "sync-issue");
    assert.deepEqual(first.syncIssue?.reasons.map(({ field }) => field), ["eventRole", "group"]);

    const second = (await sync("555", { ...peter, group: "charlie" }).expect(200)).body as SyncBody;
    assert.equal(second.syncIssue?.id, first.syncIssue?.id);
    assert.equal(second.syncIssue?.occurrences, 2);
    assert.deepEqual(second.syncIssue?.reasons.map(({ field }) => field), ["group"]);

    assert.equal(await database.eventMember.count(), 0);
    assert.equal(await database.externalIdentity.count(), 0);
    assert.equal(await database.domainUser.count(), 1);

    const list = await request(app)
      .get(`/api/v1/events/${eventId}/sync-issues?status=open`)
      .set("Cookie", admin.cookie)
      .expect(200);
    assert.equal((list.body as { items: unknown[] }).items.length, 1);
  });

  void it("resolves an issue by retry after the missing group exists", async () => {
    const issue = (await sync("555", { ...peter, group: "charlie" }).expect(200)).body as SyncBody;
    const issueId = issue.syncIssue?.id ?? "";
    const retryUrl = `/api/v1/events/${eventId}/sync-issues/${issueId}/retry`;

    const stillOpen = (await request(app).post(retryUrl).set("Cookie", admin.cookie).send({}).expect(200))
      .body as SyncBody;
    assert.equal(stillOpen.outcome, "sync-issue");

    await addSlugs("groups", "charlie");
    const resolved = (await request(app).post(retryUrl).set("Cookie", admin.cookie).send({}).expect(200))
      .body as SyncBody;
    assert.equal(resolved.outcome, "member");
    assert.equal(resolved.member?.eventGroup.slug, "charlie");

    const stored = await database.syncIssue.findUniqueOrThrow({ where: { id: issueId } });
    assert.equal(stored.status, "resolved");
    assert.ok(stored.resolvedAt);

    const again = await request(app).post(retryUrl).set("Cookie", admin.cookie).send({}).expect(409);
    assert.equal((again.body as ProblemBody).code, "SYNC_ISSUE_NOT_OPEN");
  });

  void it("resolves an open issue when a later sync succeeds", async () => {
    await sync("555", { ...peter, group: "charlie" }).expect(200);
    await sync("555", peter).expect(200);
    assert.equal(await database.syncIssue.count({ where: { status: "open" } }), 0);
  });

  void it("enforces the event scope of members.sync", async () => {
    const otherEvent = await createEvent();
    const ownEvent = eventId;
    eventId = otherEvent;
    await sync("123456789", peter).expect(404);

    eventId = ownEvent;
    const reader = await createApiClientKey([{ permission: "events.read", eventId }]);
    await sync("123456789", peter, reader).expect(403);
  });

  void it("rejects archived events and malformed identifiers", async () => {
    await sync("bad/id", peter).expect(404);
    await sync("123", peter, botKey, "Discord").expect(422);
    await sync("123", { ...peter, password: "nope" }).expect(422);

    await database.event.update({ where: { id: eventId }, data: { status: "archived" } });
    const response = await sync("123", peter).expect(409);
    assert.equal((response.body as ProblemBody).code, "EVENT_ARCHIVED");
  });
});
