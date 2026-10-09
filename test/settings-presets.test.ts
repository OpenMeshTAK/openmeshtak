import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, beforeEach, describe, it } from "node:test";
import type { Express } from "express";
import request from "supertest";
import { createApp } from "../src/app.js";
import { parsePresetDocument } from "../src/modules/settings-presets/preset-document.js";
import { PERMISSIONS } from "../src/shared/auth/permissions.js";
import { database, disconnectDatabase } from "../src/shared/database/database.js";
import { clearDatabase, createEvent, createUser, type TestUser } from "./support/identity.js";

interface ProblemBody {
  code?: string;
  errors?: Array<{ field: string; code: string }>;
}

interface PresetDocument {
  format: string;
  formatVersion: number;
  kind: string;
  name: string;
  meshtastic?: { firmwareVersion: string; settings: Record<string, unknown> };
  tak?: { atakPreferences: Array<{ target: { type: string; slug?: string }; key: string; value: string }> };
}

interface MeshtasticPreview {
  version: number;
  changed: Array<{ key: string; from: unknown; to: unknown }>;
  invalid: Array<{ key: string }>;
  unsupported: string[];
  secretsKept: string[];
  confirmation: string;
}

interface TakPreview {
  version: number;
  targets: Array<{ type: string; slug: string; suggestedTargetId: string | null }>;
  added: Array<{ key: string; target: { type: string; id: string | null } }>;
  changed: Array<{ key: string; from: string | null; to: string }>;
  invalid: Array<{ key: string }>;
  skipped: number;
  confirmation: string | null;
}

const appPreferences = "com.atakmap.app_preferences";
const wifiPassword = "very-secret-wifi";

let app: Express;
let admin: TestUser;
let reader: TestUser;
let sourceId: string;
let targetId: string;
let sourceGroupId: string;
let targetGroupId: string;
let sourceMemberId: string;

function eventUrl(eventId: string, path: string): string {
  return `/api/v1/events/${eventId}${path}`;
}

async function addGroup(eventId: string, name: string, slug: string, prefix: string): Promise<string> {
  const id = randomUUID();
  await database.eventGroup.create({ data: { id, eventId, name, slug, shortNamePrefix: prefix } });
  return id;
}

function atak(key: string, value: string, target: { type: string; id: string | null } = { type: "event", id: null }) {
  return { target, preference: appPreferences, key, type: "string", value };
}

void describe("settings presets", () => {
  beforeEach(async () => {
    await clearDatabase();
    app = createApp();
    admin = await createUser("Admin", PERMISSIONS.map((permission) => ({ permission })));
    sourceId = await createEvent({ meshtasticEnabled: true });
    targetId = await createEvent({ meshtasticEnabled: true });
    reader = await createUser("Reader", [{ permission: "events.read", eventId: sourceId }]);
    sourceGroupId = await addGroup(sourceId, "Bravo", "bravo", "B");
    targetGroupId = await addGroup(targetId, "Bravo Team", "bravo", "B");
    const roleId = randomUUID();
    await database.eventRole.create({ data: { id: roleId, eventId: sourceId, name: "Participant", slug: "participant" } });
    const peter = await createUser("Peter", []);
    sourceMemberId = randomUUID();
    await database.eventMember.create({
      data: {
        id: sourceMemberId,
        eventId: sourceId,
        userId: peter.id,
        eventRoleId: roleId,
        eventGroupId: sourceGroupId,
        username: "Peter",
        callsign: "Peter",
        shortNameNumber: 1,
      },
    });
  });

  after(async () => {
    await clearDatabase();
    await disconnectDatabase();
  });

  void it("exports Meshtastic settings without secrets and imports them after a confirmed preview", async () => {
    const saved = await request(app)
      .put(eventUrl(sourceId, "/meshtastic/configuration/settings"))
      .set("Cookie", admin.cookie)
      .send({ version: 0, settings: { "config.lora.hopLimit": 5, "config.network.wifiSsid": "Camp" } })
      .expect(200);
    await request(app)
      .put(eventUrl(sourceId, "/meshtastic/configuration/secrets"))
      .set("Cookie", admin.cookie)
      .send({ version: (saved.body as { version: number }).version, secrets: { "config.network.wifiPsk": wifiPassword, "config.bluetooth.fixedPin": 482913 } })
      .expect(200);

    const exported = (await request(app).get(eventUrl(sourceId, "/meshtastic/preset")).set("Cookie", reader.cookie).expect(200)).body as PresetDocument;
    assert.equal(exported.format, "openmeshtak-preset");
    assert.equal(exported.formatVersion, 1);
    assert.equal(exported.meshtastic?.settings["config.lora.hopLimit"], 5);
    const text = JSON.stringify(exported);
    assert.equal(text.includes(wifiPassword), false);
    assert.equal(text.includes("482913"), false);
    assert.equal(text.includes("fixedPin"), false);
    assert.equal("longName" in (exported.meshtastic?.settings ?? {}), false);

    // The target event keeps its own secret through the import.
    const targetSecret = await request(app)
      .put(eventUrl(targetId, "/meshtastic/configuration/secrets"))
      .set("Cookie", admin.cookie)
      .send({ version: 0, secrets: { "config.network.wifiPsk": "target-wifi" } })
      .expect(200);
    const targetVersion = (targetSecret.body as { version: number }).version;

    const edited = {
      ...exported,
      meshtastic: {
        firmwareVersion: "2.8",
        settings: { ...exported.meshtastic?.settings, "config.lora.hopLimit": 9, "config.network.wifiPsk": "x", "unknown.key": true },
      },
    };
    const preview = (await request(app).post(eventUrl(targetId, "/meshtastic/preset/preview")).set("Cookie", admin.cookie).send({ document: edited }).expect(200))
      .body as MeshtasticPreview;
    assert.equal(preview.version, targetVersion);
    assert.deepEqual(preview.invalid.map(({ key }) => key), ["config.lora.hopLimit"]);
    assert.deepEqual(preview.unsupported.sort(), ["config.network.wifiPsk", "unknown.key"]);
    assert.deepEqual(preview.changed.map(({ key }) => key), ["config.network.wifiSsid"]);
    assert.deepEqual(preview.secretsKept, ["config.network.wifiPsk"]);

    const unconfirmed = await request(app)
      .post(eventUrl(targetId, "/meshtastic/preset/import"))
      .set("Cookie", admin.cookie)
      .send({ version: targetVersion, document: edited, confirmation: "nope" })
      .expect(409);
    assert.equal((unconfirmed.body as ProblemBody).code, "PRESET_IMPORT_UNCONFIRMED");

    const imported = (
      await request(app)
        .post(eventUrl(targetId, "/meshtastic/preset/import"))
        .set("Cookie", admin.cookie)
        .send({ version: targetVersion, document: edited, confirmation: preview.confirmation })
        .expect(200)
    ).body as { settings: Record<string, unknown>; secretsSet: string[]; version: number };
    assert.equal(imported.settings["config.network.wifiSsid"], "Camp");
    assert.equal(imported.settings["config.lora.hopLimit"], 3, "the invalid value is left out");
    assert.deepEqual(imported.secretsSet, ["config.network.wifiPsk"]);
    assert.equal(await database.eventConfigurationRevision.count({ where: { eventId: targetId } }), 0, "importing never publishes");

    const stale = await request(app)
      .post(eventUrl(targetId, "/meshtastic/preset/import"))
      .set("Cookie", admin.cookie)
      .send({ version: targetVersion, document: edited, confirmation: preview.confirmation })
      .expect(409);
    assert.equal((stale.body as ProblemBody).code, "VERSION_CONFLICT");

    await request(app).post(eventUrl(targetId, "/meshtastic/preset/preview")).set("Cookie", reader.cookie).send({ document: edited }).expect(404);
  });

  void it("rejects malformed, foreign-kind and unsafe documents", async () => {
    const base = { format: "openmeshtak-preset", formatVersion: 1, kind: "meshtastic", name: "x", meshtastic: { firmwareVersion: "2.8", settings: {} } };
    const preview = (document: unknown) =>
      request(app).post(eventUrl(targetId, "/meshtastic/preset/preview")).set("Cookie", admin.cookie).send({ document });

    const future = await preview({ ...base, formatVersion: 2 }).expect(422);
    assert.equal((future.body as ProblemBody).errors?.[0]?.code, "UNSUPPORTED_FORMAT_VERSION");

    const wrongFormat = await preview({ ...base, format: "something-else" }).expect(422);
    assert.equal((wrongFormat.body as ProblemBody).errors?.[0]?.field, "document.format");

    const takHere = await preview({ format: "openmeshtak-preset", formatVersion: 1, kind: "tak", name: "x", tak: { atakPreferences: [] } }).expect(422);
    assert.equal((takHere.body as ProblemBody).errors?.[0]?.code, "WRONG_PRESET_KIND");

    const polluted = JSON.parse(
      '{"format":"openmeshtak-preset","formatVersion":1,"kind":"meshtastic","name":"x","meshtastic":{"firmwareVersion":"2.8","settings":{"__proto__":true}}}',
    ) as unknown;
    const parsed = parsePresetDocument(polluted);
    assert.equal(Object.hasOwn(parsed.meshtastic?.settings ?? {}, "__proto__"), false);
    assert.equal(Object.getPrototypeOf(parsed.meshtastic?.settings), Object.prototype);
    const constructorKey = await preview({ ...base, meshtastic: { firmwareVersion: "2.8", settings: { constructor: true } } }).expect(422);
    assert.equal((constructorKey.body as ProblemBody).errors?.[0]?.code, "INVALID_PRESET");
    const response = await preview(polluted);
    assert.ok([200, 422].includes(response.status));
    assert.equal(Object.getPrototypeOf({}), Object.prototype);
    assert.equal(Object.keys(Object.prototype).length, 0);
  });

  void it("exports TAK preferences without member entries and imports them through explicit mappings", async () => {
    await request(app)
      .put(eventUrl(sourceId, "/tak/atak-preferences"))
      .set("Cookie", admin.cookie)
      .send({
        version: 0,
        entries: [
          atak("coord_display_pref", "MGRS"),
          atak("coord_display_pref", "DD", { type: "group", id: sourceGroupId }),
          atak("saEmailAddress", "peter@example.org", { type: "member", id: sourceMemberId }),
        ],
      })
      .expect(200);

    const exported = (await request(app).get(eventUrl(sourceId, "/tak/preset")).set("Cookie", admin.cookie).expect(200)).body as PresetDocument;
    assert.equal(JSON.stringify(exported).includes("peter@example.org"), false);
    assert.equal(JSON.stringify(exported).includes(sourceGroupId), false);
    assert.deepEqual(
      exported.tak?.atakPreferences.map(({ target, value }) => `${target.type}:${target.slug ?? ""}:${value}`),
      ["event::MGRS", "group:bravo:DD"],
    );

    await request(app)
      .put(eventUrl(targetId, "/tak/atak-preferences"))
      .set("Cookie", admin.cookie)
      .send({ version: 0, entries: [atak("coord_display_pref", "UTM")] })
      .expect(200);

    const unmapped = (await request(app).post(eventUrl(targetId, "/tak/preset/preview")).set("Cookie", admin.cookie).send({ document: exported }).expect(200))
      .body as TakPreview;
    assert.equal(unmapped.confirmation, null);
    assert.deepEqual(unmapped.targets.map(({ slug, suggestedTargetId }) => [slug, suggestedTargetId]), [["bravo", targetGroupId]]);
    assert.deepEqual(unmapped.changed.map(({ from, to }) => [from, to]), [["UTM", "MGRS"]]);

    const refused = await request(app)
      .post(eventUrl(targetId, "/tak/preset/import"))
      .set("Cookie", admin.cookie)
      .send({ version: unmapped.version, document: exported, mappings: [], confirmation: "x" })
      .expect(422);
    assert.equal((refused.body as ProblemBody).errors?.[0]?.code, "MAPPING_REQUIRED");

    await request(app)
      .post(eventUrl(targetId, "/tak/preset/preview"))
      .set("Cookie", admin.cookie)
      .send({ document: exported, mappings: [{ type: "group", slug: "bravo", targetId: sourceGroupId }] })
      .expect(422);

    const mappings = [{ type: "group", slug: "bravo", targetId: targetGroupId }];
    const mapped = (await request(app).post(eventUrl(targetId, "/tak/preset/preview")).set("Cookie", admin.cookie).send({ document: exported, mappings }).expect(200))
      .body as TakPreview;
    assert.ok(mapped.confirmation !== null);
    assert.deepEqual(mapped.added.map(({ target }) => target.id), [targetGroupId]);

    const list = (
      await request(app)
        .post(eventUrl(targetId, "/tak/preset/import"))
        .set("Cookie", admin.cookie)
        .send({ version: mapped.version, document: exported, mappings, confirmation: mapped.confirmation })
        .expect(200)
    ).body as { entries: Array<{ target: { type: string; id: string | null }; value: string }>; version: number };
    assert.deepEqual(
      list.entries.map(({ target, value }) => `${target.type}:${value}`),
      ["event:MGRS", "group:DD"],
    );
    assert.equal(await database.eventConfigurationRevision.count({ where: { eventId: targetId } }), 0);

    const skipped = (
      await request(app)
        .post(eventUrl(targetId, "/tak/preset/preview"))
        .set("Cookie", admin.cookie)
        .send({ document: exported, mappings: [{ type: "group", slug: "bravo", targetId: null }] })
        .expect(200)
    ).body as TakPreview;
    assert.equal(skipped.skipped, 1);
    assert.ok(skipped.confirmation !== null);
  });

  void it("reports catalog problems of a TAK preset as invalid entries", async () => {
    const document = {
      format: "openmeshtak-preset",
      formatVersion: 1,
      kind: "tak",
      name: "Bad",
      tak: {
        atakPreferences: [
          { target: { type: "event" }, preference: appPreferences, key: "coord_display_pref", type: "string", value: "NOPE" },
          { target: { type: "event" }, preference: appPreferences, key: "locationCallsign", type: "string", value: "ADMIN" },
          { target: { type: "event" }, preference: appPreferences, key: "saEmailAddress", type: "string", value: "a@b.c" },
        ],
      },
    };
    const preview = (await request(app).post(eventUrl(targetId, "/tak/preset/preview")).set("Cookie", admin.cookie).send({ document }).expect(200))
      .body as TakPreview;
    assert.deepEqual(preview.invalid.map(({ key }) => key), ["coord_display_pref", "locationCallsign", "saEmailAddress"]);
    assert.equal(preview.added.length, 0);
  });

  void it("keeps a global library whose edits never change an event", async () => {
    const exported = (await request(app).get(eventUrl(sourceId, "/meshtastic/preset")).set("Cookie", admin.cookie).expect(200)).body as PresetDocument;
    const created = (await request(app).post("/api/v1/presets").set("Cookie", admin.cookie).send({ document: exported, name: "Camp radio" }).expect(201))
      .body as { id: string; version: number; kind: string; itemCount: number; document: PresetDocument };
    assert.equal(created.kind, "meshtastic");
    assert.ok(created.itemCount > 0);
    assert.equal(created.document.name, "Camp radio");

    const secret = await request(app)
      .post("/api/v1/presets")
      .set("Cookie", admin.cookie)
      .send({ document: { ...exported, meshtastic: { firmwareVersion: "2.8", settings: { "config.network.wifiPsk": "x" } } } })
      .expect(422);
    assert.equal((secret.body as ProblemBody).errors?.[0]?.code, "SECRET_NOT_ALLOWED");

    const memberOnly = await request(app)
      .post("/api/v1/presets")
      .set("Cookie", admin.cookie)
      .send({
        document: {
          format: "openmeshtak-preset",
          formatVersion: 1,
          kind: "tak",
          name: "Personal",
          tak: { atakPreferences: [{ target: { type: "event" }, preference: appPreferences, key: "saEmailAddress", type: "string", value: "a@b.c" }] },
        },
      })
      .expect(422);
    assert.equal((memberOnly.body as ProblemBody).errors?.[0]?.code, "MEMBER_ONLY");

    // Apply the library preset to the target event, then edit the template.
    const preview = (
      await request(app).post(eventUrl(targetId, "/meshtastic/preset/preview")).set("Cookie", admin.cookie).send({ document: created.document }).expect(200)
    ).body as MeshtasticPreview;
    await request(app)
      .post(eventUrl(targetId, "/meshtastic/preset/import"))
      .set("Cookie", admin.cookie)
      .send({ version: preview.version, document: created.document, confirmation: preview.confirmation })
      .expect(200);
    const before = await database.meshtasticConfiguration.findUniqueOrThrow({ where: { eventId: targetId } });

    const changedSettings = { ...created.document.meshtastic?.settings, "config.lora.hopLimit": 7 };
    const updated = (
      await request(app)
        .put(`/api/v1/presets/${created.id}`)
        .set("Cookie", admin.cookie)
        .send({ version: created.version, name: "Camp radio v2", description: null, document: { ...created.document, meshtastic: { firmwareVersion: "2.8", settings: changedSettings } } })
        .expect(200)
    ).body as { version: number; name: string };
    assert.equal(updated.name, "Camp radio v2");
    const after = await database.meshtasticConfiguration.findUniqueOrThrow({ where: { eventId: targetId } });
    assert.deepEqual(after.settings, before.settings);
    assert.equal(after.version, before.version);

    await request(app).put(`/api/v1/presets/${created.id}`).set("Cookie", admin.cookie).send({ version: created.version, name: "x", description: null }).expect(409);

    const page = (await request(app).get("/api/v1/presets?kind=meshtastic").set("Cookie", admin.cookie).expect(200)).body as { items: Array<{ id: string }> };
    assert.deepEqual(page.items.map(({ id }) => id), [created.id]);
    await request(app).get("/api/v1/presets?kind=tak&unknown=1").set("Cookie", admin.cookie).expect(422);
    await request(app).get("/api/v1/presets").set("Cookie", reader.cookie).expect(403);

    await request(app).delete(`/api/v1/presets/${created.id}`).set("Cookie", admin.cookie).expect(204);
    await request(app).get(`/api/v1/presets/${created.id}`).set("Cookie", admin.cookie).expect(404);
  });
});
