import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, beforeEach, describe, it } from "node:test";
import type { Express } from "express";
import request from "supertest";
import { createApp } from "../src/app.js";
import { PERMISSIONS } from "../src/shared/auth/permissions.js";
import { database, disconnectDatabase } from "../src/shared/database/database.js";
import { clearDatabase, createEvent, createUser, type TestUser } from "./support/identity.js";

const none = { groupIds: [], roleIds: [], memberIds: [] };

let app: Express;
let admin: TestUser;
let peter: TestUser;
let anna: TestUser;
let eventId: string;
let bravoId: string;
let peterMemberId: string;
let annaMemberId: string;

function packagesUrl(): string {
  return `/api/v1/events/${eventId}/data-packages`;
}

function memberPackagesUrl(memberId: string, path = ""): string {
  return `/api/v1/events/${eventId}/members/${memberId}/data-packages${path}`;
}

/** Creates a package, optionally narrows its audience and publishes it unless told not to. */
async function createPackage(name: string, groupIds: string[] | null, publish = true): Promise<string> {
  const created = (
    await request(app).post(packagesUrl()).set("Cookie", admin.cookie).send({ name }).expect(201)
  ).body as { id: string; version: number };
  if (groupIds !== null) {
    await request(app)
      .put(`${packagesUrl()}/${created.id}/audience`)
      .set("Cookie", admin.cookie)
      .send({ version: created.version, audience: { allMembers: false, ...none, groupIds } })
      .expect(200);
  }
  if (publish) {
    await request(app).post(`${packagesUrl()}/${created.id}/revisions`).set("Cookie", admin.cookie).expect(200);
  }
  return created.id;
}

async function names(user: TestUser, memberId: string): Promise<string[]> {
  const response = await request(app).get(memberPackagesUrl(memberId)).set("Cookie", user.cookie).expect(200);
  return (response.body as Array<{ name: string }>).map(({ name }) => name);
}

void describe("member data packages", () => {
  beforeEach(async () => {
    await clearDatabase();
    app = createApp();
    admin = await createUser("Admin", PERMISSIONS.map((permission) => ({ permission })));
    peter = await createUser("Peter", []);
    anna = await createUser("Anna", []);
    eventId = await createEvent();
    await database.event.update({ where: { id: eventId }, data: { status: "active" } });

    const roleId = randomUUID();
    bravoId = randomUUID();
    const charlieId = randomUUID();
    peterMemberId = randomUUID();
    annaMemberId = randomUUID();
    await database.eventRole.create({ data: { id: roleId, eventId, name: "Participant", slug: "participant" } });
    await database.eventGroup.createMany({
      data: [
        { id: bravoId, eventId, name: "Bravo", slug: "bravo", shortNamePrefix: "B" },
        { id: charlieId, eventId, name: "Charlie", slug: "charlie", shortNamePrefix: "C" },
      ],
    });
    await database.eventMember.createMany({
      data: [
        { id: peterMemberId, eventId, userId: peter.id, eventRoleId: roleId, eventGroupId: bravoId, username: "Peter", callsign: "Peter", shortNameNumber: 1 },
        { id: annaMemberId, eventId, userId: anna.id, eventRoleId: roleId, eventGroupId: charlieId, username: "Anna", callsign: "Anna", shortNameNumber: 1 },
      ],
    });
  });

  after(async () => {
    await clearDatabase();
    await disconnectDatabase();
  });

  void it("lists only published packages whose audience includes the member", async () => {
    await createPackage("Everyone", null);
    await createPackage("Bravo only", [bravoId]);
    await createPackage("Draft", null, false);

    assert.deepEqual(await names(peter, peterMemberId), ["Bravo only", "Everyone"]);
    assert.deepEqual(await names(anna, annaMemberId), ["Everyone"]);
    assert.deepEqual(await names(admin, annaMemberId), ["Everyone"], "members.read previews the list");
  });

  void it("lets members download only their own packages and audits it", async () => {
    const bravoPackage = await createPackage("Bravo only", [bravoId]);

    const download = await request(app)
      .get(memberPackagesUrl(peterMemberId, `/${bravoPackage}/atak`))
      .set("Cookie", peter.cookie)
      .expect(200);
    assert.match(String(download.headers["content-disposition"]), /Bravo_only-r1\.zip/);
    assert.equal(await database.auditEvent.count({ where: { action: "data-package.downloaded" } }), 1);

    await request(app).get(memberPackagesUrl(annaMemberId, `/${bravoPackage}/atak`)).set("Cookie", anna.cookie).expect(404);
    await request(app).get(memberPackagesUrl(peterMemberId, `/${bravoPackage}/atak`)).set("Cookie", anna.cookie).expect(404);
    await request(app).get(memberPackagesUrl(peterMemberId)).set("Cookie", anna.cookie).expect(404);
  });

  void it("hides everything while the event is not active", async () => {
    await createPackage("Everyone", null);
    await database.event.update({ where: { id: eventId }, data: { status: "archived" } });
    await request(app).get(memberPackagesUrl(peterMemberId)).set("Cookie", peter.cookie).expect(404);
  });
});
