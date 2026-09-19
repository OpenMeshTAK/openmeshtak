import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, beforeEach, describe, it } from "node:test";
import type { Express } from "express";
import request from "supertest";
import { createApp } from "../src/app.js";
import {
  FirmwareProfileError,
  loadFirmwareProfiles,
} from "../src/modules/meshtastic-firmware/firmware-profile-loader.js";
import { PERMISSIONS } from "../src/shared/auth/permissions.js";
import { disconnectDatabase } from "../src/shared/database/database.js";
import { clearDatabase, createEvent, createUser, type TestUser } from "./support/identity.js";

const shipped = JSON.parse(readFileSync("firmware-profiles/meshtastic-2.8/profile.json", "utf8")) as Record<
  string,
  unknown
> & { fields: Record<string, Record<string, unknown>>; firmware: Record<string, unknown> };

const temporaryDirectories: string[] = [];

function profileDirectory(...profiles: unknown[]): string {
  const root = mkdtempSync(join(tmpdir(), "omtk-profiles-"));
  temporaryDirectories.push(root);
  profiles.forEach((profile, index) => {
    mkdirSync(join(root, `p${String(index)}`));
    writeFileSync(join(root, `p${String(index)}`, "profile.json"), JSON.stringify(profile));
  });
  return root;
}

async function loadProblems(...profiles: unknown[]): Promise<string> {
  try {
    await loadFirmwareProfiles([profileDirectory(...profiles)]);
  } catch (error: unknown) {
    assert.ok(error instanceof FirmwareProfileError);
    return error.message;
  }
  assert.fail("expected the profiles to be rejected");
}

function withField(key: string, field: Record<string, unknown>) {
  return { ...shipped, fields: { ...shipped.fields, [key]: field } };
}

void describe("firmware profile loading", () => {
  after(() => {
    for (const directory of temporaryDirectories) {
      rmSync(directory, { recursive: true, force: true });
    }
  });

  void it("loads the shipped 2.8 profile against the official protobuf package", async () => {
    const [profile] = await loadFirmwareProfiles(["firmware-profiles"]);
    assert.equal(profile?.file.id, "meshtastic-2.8");
    assert.equal(profile?.file.protobufs.version, "2.8.1");
    assert.match(profile?.sha256 ?? "", /^[0-9a-f]{64}$/);
    assert.ok(profile?.fields.some(({ key }) => key === "config.security.packetSignaturePolicy"));
  });

  void it("rejects fields, types and enum values the protobuf schema does not have", async () => {
    assert.match(
      await loadProblems(withField("config.lora.warpDrive", { section: "lora", type: "boolean", default: true, label: "Warp" })),
      /config\.lora\.warpDrive does not exist in DeviceProfile/,
    );
    assert.match(
      await loadProblems(withField("config.lora.hopLimit", { section: "lora", type: "boolean", default: true, label: "Hops" })),
      /config\.lora\.hopLimit has protobuf scalar type UINT32, not boolean/,
    );
    assert.match(
      await loadProblems({ ...shipped, enums: { ...(shipped.enums as object), "Config.LoRaConfig.RegionCode": ["MARS"] } }),
      /unknown to the protobuf schema: MARS/,
    );
  });

  void it("rejects broken versions, defaults, sections and package pins", async () => {
    const problems = await loadProblems(
      {
        ...withField("config.lora.txEnabled", { section: "nowhere", type: "boolean", label: "TX", since: "2.7.1" }),
        protobufs: { module: "@meshtastic/protobufs", version: "2.8.1" },
      },
    );
    assert.match(problems, /uses unknown section nowhere/);
    assert.match(problems, /since 2\.7\.1 outside 2\.8/);
    assert.match(problems, /is editable and needs a default/);

    assert.match(
      await loadProblems({ ...shipped, protobufs: { module: "@meshtastic/protobufs", version: "2.7.0" } }),
      /is 2\.8\.1, but the profile requires 2\.7\.0/,
    );
    assert.match(await loadProblems(shipped, { ...shipped, id: "copy" }), /both use line 2\.8/);
    assert.match(await loadProblems({ ...shipped, default: false }), /exactly one firmware profile/);
  });
});

void describe("firmware profile API", () => {
  let app: Express;
  let admin: TestUser;

  beforeEach(async () => {
    await clearDatabase();
    app = createApp();
    admin = await createUser("Admin", PERMISSIONS.map((permission) => ({ permission })));
  });

  after(async () => {
    await clearDatabase();
    await disconnectDatabase();
  });

  void it("lists the shipped line and the test-only line without code changes", async () => {
    const response = await request(app).get("/api/v1/meshtastic/firmware-profiles").set("Cookie", admin.cookie).expect(200);
    assert.deepEqual(
      (response.body as Array<{ id: string; line: string; default: boolean }>).map(({ id, line, default: isDefault }) => [
        id,
        line,
        isDefault,
      ]),
      [
        ["meshtastic-test-9.9", "9.9", false],
        ["meshtastic-2.8", "2.8", true],
      ],
    );
  });

  void it("returns fields with their effective first version and managed flag", async () => {
    const response = await request(app)
      .get("/api/v1/meshtastic/firmware-profiles/meshtastic-test-9.9")
      .set("Cookie", admin.cookie)
      .expect(200);
    const fields = (response.body as { fields: Array<{ key: string; since: string; managed: boolean }> }).fields;
    assert.deepEqual(
      fields.map(({ key, since, managed }) => [key, since, managed]),
      [
        ["longName", "9.9.0", true],
        ["shortName", "9.9.0", true],
        ["config.lora.region", "9.9.0", false],
        ["config.lora.hopLimit", "9.9.0", false],
        ["config.lora.ignoreMqtt", "9.9.3", false],
      ],
    );

    await request(app).get("/api/v1/meshtastic/firmware-profiles/unknown").set("Cookie", admin.cookie).expect(404);
  });

  void it("is limited to people who manage events", async () => {
    const eventId = await createEvent();
    const reader = await createUser("Reader", [{ permission: "events.read", eventId }]);
    const manager = await createUser("Manager", [{ permission: "events.manage", eventId }]);

    await request(app).get("/api/v1/meshtastic/firmware-profiles").set("Cookie", reader.cookie).expect(403);
    await request(app).get("/api/v1/meshtastic/firmware-profiles").set("Cookie", manager.cookie).expect(200);
  });
});
