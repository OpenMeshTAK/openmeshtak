import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, beforeEach, describe, it } from "node:test";
import { strFromU8, unzipSync } from "fflate";
import type { Express } from "express";
import request from "supertest";
import { createApp } from "../src/app.js";
import { PERMISSIONS } from "../src/shared/auth/permissions.js";
import { database, disconnectDatabase } from "../src/shared/database/database.js";
import { clearDatabase, createEvent, createUser, type TestUser } from "./support/identity.js";

interface ListBody {
  version: number;
  entries: Array<{ target: { type: string; id: string | null }; key: string; value: string }>;
}

const appPreferences = "com.atakmap.app_preferences";

let app: Express;
let admin: TestUser;
let outsider: TestUser;
let eventId: string;
let bravoId: string;
let memberId: string;

function url(path = ""): string {
  return `/api/v1/events/${eventId}/tak/atak-preferences${path}`;
}

function entry(key: string, value: string, target: { type: string; id: string | null } = { type: "event", id: null }) {
  return { target, preference: appPreferences, key, type: "string", value };
}

void describe("ATAK preference list", () => {
  beforeEach(async () => {
    await clearDatabase();
    app = createApp();
    admin = await createUser("Admin", PERMISSIONS.map((permission) => ({ permission })));
    outsider = await createUser("Outsider", []);
    eventId = await createEvent();
    const roleId = randomUUID();
    bravoId = randomUUID();
    memberId = randomUUID();
    await database.eventRole.create({ data: { id: roleId, eventId, name: "Participant", slug: "participant" } });
    await database.eventGroup.create({ data: { id: bravoId, eventId, name: "Bravo", slug: "bravo", shortNamePrefix: "B" } });
    const peter = await createUser("Peter", []);
    await database.eventMember.create({
      data: { id: memberId, eventId, userId: peter.id, eventRoleId: roleId, eventGroupId: bravoId, username: "Peter", callsign: "Peter", shortNameNumber: 1 },
    });
  });

  after(async () => {
    await clearDatabase();
    await disconnectDatabase();
  });

  void it("replaces the list with versioning and keeps targets", async () => {
    const empty = (await request(app).get(url()).set("Cookie", admin.cookie).expect(200)).body as ListBody;
    assert.deepEqual(empty.entries, []);
    assert.equal(empty.version, 0);

    const saved = await request(app)
      .put(url())
      .set("Cookie", admin.cookie)
      .send({
        version: 0,
        entries: [
          entry("coord_display_pref", "MGRS"),
          entry("coord_display_pref", "DD", { type: "group", id: bravoId }),
          { ...entry("saEmailAddress", "peter@example.org", { type: "member", id: memberId }) },
        ],
      })
      .expect(200);
    const list = saved.body as ListBody;
    assert.equal(list.version, 1);
    assert.deepEqual(
      list.entries.map(({ target, value }) => [target.type, value]),
      [
        ["event", "MGRS"],
        ["group", "DD"],
        ["member", "peter@example.org"],
      ],
    );

    const stale = await request(app).put(url()).set("Cookie", admin.cookie).send({ version: 0, entries: [] }).expect(409);
    assert.equal((stale.body as { currentVersion: number }).currentVersion, 1);

    const invalid = await request(app)
      .put(url())
      .set("Cookie", admin.cookie)
      .send({ version: 1, entries: [entry("locationCallsign", "ADMIN")] })
      .expect(422);
    assert.equal((invalid.body as { errors: Array<{ field: string }> }).errors[0]?.field, "entries[0].key");

    const malformedTarget = await request(app)
      .put(url())
      .set("Cookie", admin.cookie)
      .send({ version: 1, entries: [entry("coord_display_pref", "MGRS", { type: "event", id: bravoId })] })
      .expect(422);
    assert.equal((malformedTarget.body as { errors: Array<{ field: string }> }).errors[0]?.field, "entries[0].target.id");

    const audit = await database.auditEvent.findFirstOrThrow({ where: { action: "tak-configuration.atak-preferences-updated" } });
    assert.ok(!JSON.stringify(audit.metadata).includes("peter@example.org"), "values stay out of the audit log");
  });

  void it("imports a file next to targeted entries and reports what it left out", async () => {
    await request(app)
      .put(url())
      .set("Cookie", admin.cookie)
      .send({ version: 0, entries: [entry("coord_display_pref", "MGRS"), entry("coord_display_pref", "UTM", { type: "group", id: bravoId })] })
      .expect(200);
    const imported = await request(app)
      .post(url("/import"))
      .set("Cookie", admin.cookie)
      .send({
        version: 1,
        fileName: "atak.pref",
        content:
          '<preferences><preference version="1" name="com.atakmap.app_preferences">' +
          '<entry key="coord_display_pref" class="class java.lang.String">DD</entry>' +
          '<entry key="coord_display_pref" class="class java.lang.String">DM</entry>' +
          '<entry key="alt_display_agl" class="class java.lang.String">true</entry>' +
          '<entry key="clientPassword" class="class java.lang.String">secret</entry></preference></preferences>',
      })
      .expect(200);
    const result = imported.body as { list: ListBody; importedCount: number; removedKeys: string[]; invalidKeys: Array<{ key: string }> };
    assert.equal(result.importedCount, 1);
    assert.deepEqual(result.removedKeys, ["clientPassword"]);
    assert.deepEqual(result.invalidKeys.map(({ key }) => key), ["alt_display_agl"], "ATAK stores this key as a boolean");
    assert.deepEqual(
      result.list.entries.map(({ target, value }) => [target.type, value]),
      [
        ["event", "DM"],
        ["group", "UTM"],
      ],
    );
  });

  void it("drops a member's entries with the member and hides the list from outsiders", async () => {
    await request(app)
      .put(url())
      .set("Cookie", admin.cookie)
      .send({ version: 0, entries: [entry("saEmailAddress", "peter@example.org", { type: "member", id: memberId })] })
      .expect(200);
    await database.eventMember.delete({ where: { id: memberId } });
    assert.deepEqual(((await request(app).get(url()).set("Cookie", admin.cookie).expect(200)).body as ListBody).entries, []);

    await request(app).get(url()).set("Cookie", outsider.cookie).expect(404);
    await request(app).get("/api/v1/tak/atak-preference-catalog").set("Cookie", outsider.cookie).expect(403);
    const catalog = (await request(app).get("/api/v1/tak/atak-preference-catalog").set("Cookie", admin.cookie).expect(200)).body as {
      topics: Array<{ keys: Array<{ key: string; use: string | null }> }>;
    };
    assert.ok(catalog.topics.some(({ keys }) => keys.some(({ key, use }) => key === "coord_display_pref" && use === "form")));
  });

  void it("accepts restrictions of known settings items and refuses unknown items", async () => {
    const restriction = (key: string, value = "true", type = "boolean") => ({ ...entry(key, value), type });
    await request(app)
      .put(url())
      .set("Cookie", admin.cookie)
      .send({
        version: 0,
        entries: [
          restriction("disablePreferenceItem_coord_display_pref"),
          restriction("hidePreferenceItem_coord_display_pref", "false"),
          restriction("hidePreferenceItem_locationCallsign"),
        ],
      })
      .expect(200);

    const unknown = await request(app)
      .put(url())
      .set("Cookie", admin.cookie)
      .send({ version: 1, entries: [restriction("hidePreferenceItem_noSuchItem")] })
      .expect(422);
    assert.equal((unknown.body as { errors: Array<{ code: string }> }).errors[0]?.code, "UNKNOWN_SETTINGS_ITEM");
    const wrongType = await request(app)
      .put(url())
      .set("Cookie", admin.cookie)
      .send({ version: 1, entries: [restriction("hidePreferenceItem_locationCallsign", "true", "string")] })
      .expect(422);
    assert.equal((wrongType.body as { errors: Array<{ field: string }> }).errors[0]?.field, "entries[0].type");
  });

  void it("unlocks every item the event restricted, also after the restriction was removed", async () => {
    const download = () =>
      request(app)
        .get(url("/unlock-package"))
        .set("Cookie", admin.cookie)
        .buffer(true)
        .parse((response, callback) => {
          const chunks: Buffer[] = [];
          response.on("data", (chunk: Buffer) => chunks.push(chunk));
          response.on("end", () => callback(null, Buffer.concat(chunks)));
        });
    await download().expect(409);

    await database.event.update({ where: { id: eventId }, data: { status: "active" } });
    const hidden = { ...entry("hidePreferenceItem_serverConnections", "true", { type: "group", id: bravoId }), type: "boolean" };
    await request(app).put(url()).set("Cookie", admin.cookie).send({ version: 0, entries: [hidden] }).expect(200);
    await request(app).post(`/api/v1/events/${eventId}/configuration-revisions`).set("Cookie", admin.cookie).expect(200);
    await request(app).put(url()).set("Cookie", admin.cookie).send({ version: 1, entries: [] }).expect(200);

    const files = unzipSync((await download().expect(200)).body as Buffer);
    const preferences = strFromU8(files["preferences/openmeshtak-unlock.pref"] ?? new Uint8Array());
    assert.ok(preferences.includes('<entry key="disablePreferenceItem_serverConnections" class="class java.lang.Boolean">false</entry>'));
    assert.ok(preferences.includes('<entry key="hidePreferenceItem_serverConnections" class="class java.lang.Boolean">false</entry>'));
    assert.ok(strFromU8(files["MANIFEST/manifest.xml"] ?? new Uint8Array()).includes('zipEntry="preferences/openmeshtak-unlock.pref"'));

    await request(app).get(url("/unlock-package")).set("Cookie", outsider.cookie).expect(404);
  });
});
