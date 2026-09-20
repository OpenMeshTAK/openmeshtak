import assert from "node:assert/strict";
import { after, beforeEach, describe, it } from "node:test";
import type { Express } from "express";
import request from "supertest";
import { createApp } from "../src/app.js";
import {
  callsignFits,
  nextShortNameNumber,
  renderCallsign,
  shortNameFits,
} from "../src/modules/event-members/member-identity.js";
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
  callsign: string;
  callsignOverride: string | null;
  shortName: string | null;
}

interface SyncBody {
  outcome: string;
  member?: MemberBody;
  syncIssue?: { id: string; reasons: Array<{ field: string; code: string }> };
}

interface GroupBody {
  id: string;
  version: number;
}

const bravoProvisioning = {
  callsignFormat: "{username} [{group}]",
  shortNamePrefix: "B",
  tak: { team: "Purple", role: "Team Member", serverGroups: [] },
  missionGroups: [],
};

let app: Express;
let admin: TestUser;
let eventId: string;
let botKey: string;
let bravo: GroupBody;

function sync(externalId: string, username: string, group = "bravo"): Promise<SyncBody> {
  return request(app)
    .put(`/api/v1/events/${eventId}/external-members/discord/${externalId}`)
    .set("Authorization", `Bearer ${botKey}`)
    .send({ username, eventRole: "participant", group })
    .expect(200)
    .then((response) => response.body as SyncBody);
}

function updateBravo(changes: Record<string, unknown>): request.Test {
  return request(app)
    .put(`/api/v1/events/${eventId}/groups/${bravo.id}`)
    .set("Cookie", admin.cookie)
    .send({
      version: bravo.version,
      name: "Bravo",
      slug: "bravo",
      description: null,
      provisioning: { ...bravoProvisioning, ...changes },
    });
}

void describe("member identity rules", () => {
  void it("renders callsigns and checks upstream byte limits", () => {
    assert.equal(renderCallsign("{username} [{group}]", "Peter", "Bravo"), "Peter [Bravo]");
    assert.ok(callsignFits("x".repeat(24)));
    assert.ok(!callsignFits("x".repeat(25)));
    assert.ok(!callsignFits("ü".repeat(13)), "multi-byte characters count as bytes");
    assert.equal(nextShortNameNumber([1, 2, 4]), 3);
    assert.ok(shortNameFits("B", 999));
    assert.ok(!shortNameFits("B", 1000));
    assert.ok(!shortNameFits("BRV", 10));
  });
});

void describe("member callsigns and short names", () => {
  beforeEach(async () => {
    await clearDatabase();
    app = createApp();
    admin = await createUser("Admin", PERMISSIONS.map((permission) => ({ permission })));
    eventId = await createEvent();
    botKey = await createServiceAccountKey([{ permission: "members.sync", eventId }]);

    await request(app)
      .post(`/api/v1/events/${eventId}/roles`)
      .set("Cookie", admin.cookie)
      .send({ name: "Participant", slug: "participant" })
      .expect(201);
    bravo = (
      await request(app)
        .post(`/api/v1/events/${eventId}/groups`)
        .set("Cookie", admin.cookie)
        .send({ name: "Bravo", slug: "bravo", provisioning: bravoProvisioning })
        .expect(201)
    ).body as GroupBody;
    await request(app)
      .post(`/api/v1/events/${eventId}/groups`)
      .set("Cookie", admin.cookie)
      .send({ name: "Alpha", slug: "alpha" })
      .expect(201);
  });

  after(async () => {
    await clearDatabase();
    await disconnectDatabase();
  });

  void it("gives Peter the callsign Peter [Bravo] and stable short names B1, B2", async () => {
    const peter = await sync("1", "Peter");
    const anna = await sync("2", "Anna");
    assert.equal(peter.member?.callsign, "Peter [Bravo]");
    assert.equal(peter.member?.shortName, "B1");
    assert.equal(anna.member?.shortName, "B2");

    // Re-syncing keeps the number; a free number is reused after a member leaves.
    assert.equal((await sync("1", "Peter")).member?.shortName, "B1");
    await request(app)
      .delete(`/api/v1/events/${eventId}/members/${peter.member?.id ?? ""}`)
      .set("Cookie", admin.cookie)
      .expect(204);
    assert.equal((await sync("3", "Clara")).member?.shortName, "B1");
    assert.equal((await sync("2", "Anna")).member?.shortName, "B2");
  });

  void it("records a sync issue for a callsign collision and resolves it with an override", async () => {
    await sync("1", "Peter");
    const clash = await sync("2", "Peter");
    assert.equal(clash.outcome, "sync-issue");
    assert.deepEqual(clash.syncIssue?.reasons.map(({ field, code }) => `${field}:${code}`), [
      "callsign:CONFLICT",
    ]);

    const resolved = await request(app)
      .post(`/api/v1/events/${eventId}/sync-issues/${clash.syncIssue?.id ?? ""}/retry`)
      .set("Cookie", admin.cookie)
      .send({ callsignOverride: "Peter M. [Bravo]" })
      .expect(200);
    const member = (resolved.body as SyncBody).member;
    assert.equal(member?.callsign, "Peter M. [Bravo]");
    assert.equal(member?.callsignOverride, "Peter M. [Bravo]");

    // The override survives later syncs from the integration.
    assert.equal((await sync("2", "Peter")).member?.callsign, "Peter M. [Bravo]");
  });

  void it("rejects callsigns over the 24-byte long-name limit", async () => {
    const issue = await sync("1", "A-very-long-username-for-meshtastic");
    assert.deepEqual(issue.syncIssue?.reasons.map(({ field, code }) => `${field}:${code}`), [
      "callsign:TOO_LONG",
    ]);
  });

  void it("re-renders member callsigns when the group format changes", async () => {
    await sync("1", "Peter");
    const updated = await updateBravo({ callsignFormat: "{username}/B" }).expect(200);
    assert.equal((updated.body as GroupBody).version, 2);

    const member = await database.eventMember.findFirstOrThrow();
    assert.equal(member.callsign, "Peter/B");
  });

  void it("rejects group changes that would make callsigns collide", async () => {
    await sync("1", "Peter", "alpha");
    await sync("2", "Peter");

    // Alpha renders plain "{username}", so Bravo switching to "{username}" would collide.
    const response = await updateBravo({ callsignFormat: "{username}" }).expect(409);
    assert.equal((response.body as ProblemBody).code, "MEMBER_IDENTITY_CONFLICT");
    assert.equal((await database.eventMember.findFirstOrThrow({ where: { eventGroupId: bravo.id } })).callsign, "Peter [Bravo]");
  });
});
