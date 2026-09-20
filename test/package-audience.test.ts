import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, beforeEach, describe, it } from "node:test";
import type { Express } from "express";
import request from "supertest";
import { createApp } from "../src/app.js";
import { database, disconnectDatabase } from "../src/shared/database/database.js";
import { clearDatabase, createEvent, createUser, type TestUser } from "./support/identity.js";

interface PackageBody {
  id: string;
  version: number;
  audience: { allMembers: boolean; groupIds: string[]; roleIds: string[]; memberIds: string[] };
}

const none = { groupIds: [], roleIds: [], memberIds: [] };

let app: Express;
let publisher: TestUser;
let editor: TestUser;
let eventId: string;
let groupId: string;

function audienceUrl(packageId: string): string {
  return `/api/v1/events/${eventId}/data-packages/${packageId}/audience`;
}

async function createPackage(): Promise<PackageBody> {
  return (
    await request(app)
      .post(`/api/v1/events/${eventId}/data-packages`)
      .set("Cookie", publisher.cookie)
      .send({ name: "Phoenix" })
      .expect(201)
  ).body as PackageBody;
}

void describe("data package audiences", () => {
  beforeEach(async () => {
    await clearDatabase();
    app = createApp();
    eventId = await createEvent();
    groupId = randomUUID();
    await database.eventGroup.create({ data: { id: groupId, eventId, name: "Bravo", slug: "bravo" } });
    publisher = await createUser("Publisher", [
      { permission: "data-packages.read", eventId },
      { permission: "data-packages.edit", eventId },
      { permission: "data-packages.publish", eventId },
    ]);
    editor = await createUser("Editor", [
      { permission: "data-packages.read", eventId },
      { permission: "data-packages.edit", eventId },
    ]);
  });

  after(async () => {
    await clearDatabase();
    await disconnectDatabase();
  });

  void it("starts with every member and narrows to a selection", async () => {
    const created = await createPackage();
    assert.deepEqual(created.audience, { allMembers: true, ...none });

    const narrowed = (
      await request(app)
        .put(audienceUrl(created.id))
        .set("Cookie", publisher.cookie)
        .send({ version: created.version, audience: { allMembers: false, ...none, groupIds: [groupId] } })
        .expect(200)
    ).body as PackageBody;
    assert.deepEqual(narrowed.audience, { allMembers: false, ...none, groupIds: [groupId] });

    const audits = await database.auditEvent.findMany({ where: { action: "data-package.audience-updated" } });
    assert.equal(audits.length, 1);
  });

  void it("drops the selection when the package goes back to every member", async () => {
    const created = await createPackage();
    const narrowed = (
      await request(app)
        .put(audienceUrl(created.id))
        .set("Cookie", publisher.cookie)
        .send({ version: created.version, audience: { allMembers: false, ...none, groupIds: [groupId] } })
        .expect(200)
    ).body as PackageBody;

    const everyone = (
      await request(app)
        .put(audienceUrl(created.id))
        .set("Cookie", publisher.cookie)
        .send({ version: narrowed.version, audience: { allMembers: true, ...none, groupIds: [groupId] } })
        .expect(200)
    ).body as PackageBody;
    assert.deepEqual(everyone.audience, { allMembers: true, ...none });
  });

  void it("rejects foreign selections, stale versions and editors without publish permission", async () => {
    const created = await createPackage();
    const foreign = await request(app)
      .put(audienceUrl(created.id))
      .set("Cookie", publisher.cookie)
      .send({ version: created.version, audience: { allMembers: false, ...none, roleIds: [randomUUID()] } })
      .expect(422);
    assert.equal((foreign.body as { errors: Array<{ field: string }> }).errors[0]?.field, "audience.roleIds");

    await request(app)
      .put(audienceUrl(created.id))
      .set("Cookie", publisher.cookie)
      .send({ version: created.version + 1, audience: { allMembers: true, ...none } })
      .expect(409);
    await request(app)
      .put(audienceUrl(created.id))
      .set("Cookie", editor.cookie)
      .send({ version: created.version, audience: { allMembers: true, ...none } })
      .expect(403);
  });
});
