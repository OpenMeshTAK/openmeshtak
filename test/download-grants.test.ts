import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, beforeEach, describe, it } from "node:test";
import type { Express } from "express";
import request from "supertest";
import { createApp } from "../src/app.js";
import { database, disconnectDatabase } from "../src/shared/database/database.js";
import { clearDatabase, createEvent, createUser, type TestUser } from "./support/identity.js";
import { enableTakServer } from "./support/tak.js";

let app: Express;
let member: TestUser;
let other: TestUser;
let eventId: string;
let otherMemberId: string;

function grant(user: TestUser, body: Record<string, unknown>): request.Test {
  return request(app).post("/api/v1/me/download-grants").set("Cookie", user.cookie).send(body);
}

function pathOf(url: string): string {
  return new URL(url).pathname;
}

void describe("download grants", () => {
  beforeEach(async () => {
    await clearDatabase();
    app = createApp();
    const admin = await createUser("Admin", [{ permission: "tak-server.manage" }]);
    member = await createUser("Peter", []);
    other = await createUser("Anna", []);
    eventId = await createEvent();
    await database.event.update({ where: { id: eventId }, data: { status: "active" } });
    const roleId = randomUUID();
    const groupId = randomUUID();
    otherMemberId = randomUUID();
    await database.eventRole.create({ data: { id: roleId, eventId, name: "Participant", slug: "participant" } });
    await database.eventGroup.create({ data: { id: groupId, eventId, name: "Bravo", slug: "bravo", shortNamePrefix: "B" } });
    await database.eventMember.createMany({
      data: [
        { id: randomUUID(), eventId, userId: member.id, eventRoleId: roleId, eventGroupId: groupId, username: "Peter", callsign: "Peter", shortNameNumber: 1 },
        { id: otherMemberId, eventId, userId: other.id, eventRoleId: roleId, eventGroupId: groupId, username: "Anna", callsign: "Anna", shortNameNumber: 2 },
      ],
    });
    await enableTakServer(app, admin);
  });

  after(async () => {
    await clearDatabase();
    await disconnectDatabase();
  });

  void it("downloads without a session a few times within five minutes", async () => {
    const created = (await grant(member, { kind: "tak-connection-package" }).expect(201)).body as { url: string; expiresAt: string };
    const path = pathOf(created.url);
    for (let use = 0; use < 3; use += 1) {
      const response = await request(app).get(path).expect(200);
      assert.equal(response.headers["cache-control"], "no-store");
    }
    await request(app).get(path).expect(404);
    assert.equal(await database.auditEvent.count({ where: { action: "tak-server.connection-package-downloaded" } }), 3);

    const stored = await database.downloadGrant.findFirstOrThrow();
    assert.equal(created.url.includes(stored.tokenHash), false, "only the hash is stored");
  });

  void it("downloads the private iTAK connection package through a short-lived grant", async () => {
    const created = (await grant(member, { kind: "itak-connection-package" }).expect(201)).body as { url: string };
    const response = await request(app).get(pathOf(created.url)).expect(200);
    assert.equal(response.headers["content-type"], "application/zip");
    assert.equal(response.headers["cache-control"], "no-store");
    assert.equal(await database.takClientCertificate.count({ where: { userId: member.id } }), 1);
    // The package's certificate is still valid, so no second package link is issued.
    await grant(member, { kind: "itak-connection-package" }).expect(409);
  });

  void it("refuses expired links, foreign artifacts and users who lost access", async () => {
    const expiring = (await grant(member, { kind: "tak-connection-package" }).expect(201)).body as { url: string };
    await database.downloadGrant.updateMany({ data: { expiresAt: new Date(Date.now() - 1000) } });
    await request(app).get(pathOf(expiring.url)).expect(404);

    await grant(member, { kind: "device-profile", eventId, memberId: otherMemberId }).expect(404);
    await request(app).get("/api/v1/downloads/not-a-real-token").expect(404);

    const later = (await grant(member, { kind: "tak-connection-package" }).expect(201)).body as { url: string };
    await database.eventMember.deleteMany({ where: { userId: member.id } });
    await request(app).get(pathOf(later.url)).expect(404);
  });
});
