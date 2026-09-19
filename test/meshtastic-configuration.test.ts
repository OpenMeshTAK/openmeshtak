import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, beforeEach, describe, it } from "node:test";
import type { Express } from "express";
import request from "supertest";
import { createApp } from "../src/app.js";
import { PERMISSIONS } from "../src/shared/auth/permissions.js";
import { database, disconnectDatabase } from "../src/shared/database/database.js";
import { clearDatabase, createEvent, createUser, type TestUser } from "./support/identity.js";

interface ProblemBody {
  code?: string;
  errors?: Array<{ field: string; code: string }>;
}

interface ConfigurationBody {
  firmwareVersion: string;
  effectiveMinimumVersion: string | null;
  profileId: string | null;
  verified: boolean;
  settings: Record<string, string | number | boolean>;
  problems: Array<{ field: string }>;
  version: number;
}

interface PreviewBody {
  report: { kept: string[]; dropped: string[]; invalid: string[]; added: string[] };
  confirmation: string | null;
}

let app: Express;
let admin: TestUser;
let eventId: string;

function url(path = ""): string {
  return `/api/v1/events/${eventId}/meshtastic/configuration${path}`;
}

async function current(): Promise<ConfigurationBody> {
  return (await request(app).get(url()).set("Cookie", admin.cookie).expect(200)).body as ConfigurationBody;
}

function saveSettings(version: number, settings: Record<string, unknown>): request.Test {
  return request(app).put(url("/settings")).set("Cookie", admin.cookie).send({ version, settings });
}

function preview(firmwareVersion: string): request.Test {
  return request(app).post(url("/firmware/preview")).set("Cookie", admin.cookie).send({ firmwareVersion });
}

function changeFirmware(body: Record<string, unknown>): request.Test {
  return request(app).put(url("/firmware")).set("Cookie", admin.cookie).send(body);
}

void describe("event Meshtastic configuration", () => {
  beforeEach(async () => {
    await clearDatabase();
    app = createApp();
    admin = await createUser("Admin", PERMISSIONS.map((permission) => ({ permission })));
    eventId = await createEvent();
  });

  after(async () => {
    await clearDatabase();
    await disconnectDatabase();
  });

  void it("starts with the default firmware line and its profile defaults", async () => {
    const configuration = await current();
    assert.equal(configuration.firmwareVersion, "2.8");
    assert.equal(configuration.effectiveMinimumVersion, "2.8.1");
    assert.equal(configuration.profileId, "meshtastic-2.8");
    assert.equal(configuration.verified, true);
    assert.equal(configuration.version, 0);
    assert.equal(configuration.settings["config.lora.region"], "EU_868");
    assert.equal("longName" in configuration.settings, false);
  });

  void it("validates settings against the profile and keeps defaults for missing fields", async () => {
    const saved = (await saveSettings(0, { "config.lora.hopLimit": 5 }).expect(200)).body as ConfigurationBody;
    assert.equal(saved.version, 1);
    assert.equal(saved.settings["config.lora.hopLimit"], 5);
    assert.equal(saved.settings["config.lora.modemPreset"], "LONG_FAST");

    const invalid = await saveSettings(1, {
      "config.lora.hopLimit": 9,
      "config.lora.region": "MARS",
      "config.lora.warpDrive": true,
      longName: "Peter",
    }).expect(422);
    assert.deepEqual(
      (invalid.body as ProblemBody).errors?.map(({ field, code }) => `${field}:${code}`).sort(),
      [
        "settings.config.lora.hopLimit:INVALID_SETTING",
        "settings.config.lora.region:INVALID_SETTING",
        "settings.config.lora.warpDrive:UNKNOWN_SETTING",
        "settings.longName:UNKNOWN_SETTING",
      ],
    );

    const stale = await saveSettings(0, {}).expect(409);
    assert.equal((stale.body as ProblemBody).code, "VERSION_CONFLICT");
  });

  void it("requires a confirmed dry run before switching to another firmware line", async () => {
    await saveSettings(0, { "config.lora.hopLimit": 6, "config.lora.region": "JP" }).expect(200);

    const plan = (await preview("9.9").expect(200)).body as PreviewBody;
    assert.deepEqual(plan.report.kept, ["config.lora.hopLimit"]);
    assert.deepEqual(plan.report.invalid, ["config.lora.region"]);
    assert.deepEqual(plan.report.added, []);
    assert.ok(plan.report.dropped.includes("config.security.packetSignaturePolicy"));
    assert.notEqual(plan.confirmation, null);

    const unconfirmed = await changeFirmware({ version: 1, firmwareVersion: "9.9" }).expect(409);
    assert.equal((unconfirmed.body as ProblemBody).code, "FIRMWARE_CHANGE_UNCONFIRMED");
    await changeFirmware({ version: 1, firmwareVersion: "9.9", confirmation: "forged" }).expect(409);

    const changed = (
      await changeFirmware({ version: 1, firmwareVersion: "9.9", confirmation: plan.confirmation }).expect(200)
    ).body as ConfigurationBody;
    assert.equal(changed.profileId, "meshtastic-test-9.9");
    assert.equal(changed.verified, false);
    assert.deepEqual(changed.settings, { "config.lora.region": "EU_868", "config.lora.hopLimit": 6 });
  });

  void it("raises the minimum patch directly and unlocks fields added in that patch", async () => {
    const plan = (await preview("9.9").expect(200)).body as PreviewBody;
    await changeFirmware({ version: 0, firmwareVersion: "9.9", confirmation: plan.confirmation }).expect(200);

    const raise = (await preview("9.9.3").expect(200)).body as PreviewBody;
    assert.equal(raise.confirmation, null);
    assert.deepEqual(raise.report.added, ["config.lora.ignoreMqtt"]);

    const raised = (await changeFirmware({ version: 1, firmwareVersion: "9.9.3" }).expect(200)).body as ConfigurationBody;
    assert.equal(raised.effectiveMinimumVersion, "9.9.3");
    assert.equal(raised.settings["config.lora.ignoreMqtt"], true);
  });

  void it("rejects unsupported lines and patches below the profile minimum", async () => {
    const unsupported = await preview("3.0").expect(422);
    assert.equal((unsupported.body as ProblemBody).errors?.[0]?.code, "UNSUPPORTED_FIRMWARE_LINE");
    const below = await preview("2.8.0").expect(422);
    assert.equal((below.body as ProblemBody).errors?.[0]?.code, "FIRMWARE_BELOW_MINIMUM");
  });

  void it("blocks activation with invalid stored settings and snapshots valid ones", async () => {
    await database.eventRole.create({ data: { id: randomUUID(), eventId, name: "Participant", slug: "participant" } });
    await database.eventGroup.create({
      data: { id: randomUUID(), eventId, name: "Bravo", slug: "bravo", shortNamePrefix: "B" },
    });
    await database.meshtasticConfiguration.create({
      data: { eventId, firmwareVersion: "2.8", settings: { "config.lora.hopLimit": 99 } },
    });

    const refused = await request(app).post(`/api/v1/events/${eventId}/activate`).set("Cookie", admin.cookie).send({ version: 1 }).expect(409);
    assert.deepEqual(
      (refused.body as ProblemBody).errors?.map(({ field }) => field),
      ["meshtastic.settings.config.lora.hopLimit"],
    );

    await saveSettings(1, { "config.lora.hopLimit": 4 }).expect(200);
    await request(app).post(`/api/v1/events/${eventId}/activate`).set("Cookie", admin.cookie).send({ version: 1 }).expect(200);
    const revision = await database.eventConfigurationRevision.findFirstOrThrow({ where: { eventId } });
    const snapshot = revision.snapshot as { schemaVersion: number; meshtastic: Record<string, unknown> & { settings: Record<string, unknown> } };
    assert.equal(snapshot.schemaVersion, 3);
    assert.equal(snapshot.meshtastic.profileId, "meshtastic-2.8");
    assert.match(String(snapshot.meshtastic.profileSha256), /^[0-9a-f]{64}$/);
    assert.equal(snapshot.meshtastic.settings["config.lora.hopLimit"], 4);
  });
});
