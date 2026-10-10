import assert from "node:assert/strict";
import { after, beforeEach, describe, it } from "node:test";
import type { Express } from "express";
import request from "supertest";
import { createApp } from "../src/app.js";
import type { Permission } from "../src/shared/auth/permissions.js";
import { disconnectDatabase } from "../src/shared/database/database.js";
import { clearDatabase, createEvent, createUser, type TestUser } from "./support/identity.js";

let app: Express;
let eventId: string;

function user(name: string, permissions: Permission[]): Promise<TestUser> {
  return createUser(name, [{ permission: "events.read", eventId }, ...permissions.map((permission) => ({ permission, eventId }))]);
}

function eventUrl(path: string): string {
  return `/api/v1/events/${eventId}${path}`;
}

void describe("feature permissions", () => {
  beforeEach(async () => {
    await clearDatabase();
    app = createApp();
    eventId = await createEvent({ meshtasticEnabled: true });
  });

  after(async () => {
    await clearDatabase();
    await disconnectDatabase();
  });

  void it("separates TAK settings from Meshtastic settings and from events.manage", async () => {
    const takSettings = eventUrl("/tak/atak-preferences");
    const meshtasticSettings = eventUrl("/meshtastic/configuration/settings");

    const manager = await user("Manager", ["events.manage"]);
    await request(app).put(takSettings).set("Cookie", manager.cookie).send({ version: 0, entries: [] }).expect(403);
    await request(app).put(meshtasticSettings).set("Cookie", manager.cookie).send({ version: 0, settings: {} }).expect(403);

    const takAdmin = await user("TAK", ["tak-settings.manage"]);
    await request(app).put(takSettings).set("Cookie", takAdmin.cookie).send({ version: 0, entries: [] }).expect(200);
    await request(app).put(meshtasticSettings).set("Cookie", takAdmin.cookie).send({ version: 0, settings: {} }).expect(403);

    const radioAdmin = await user("Radio", ["meshtastic-settings.manage"]);
    const configuration = (await request(app).get(eventUrl("/meshtastic/configuration")).set("Cookie", radioAdmin.cookie).expect(200)).body as {
      version: number;
    };
    await request(app).put(meshtasticSettings).set("Cookie", radioAdmin.cookie).send({ version: configuration.version, settings: {} }).expect(200);
    await request(app).put(takSettings).set("Cookie", radioAdmin.cookie).send({ version: 1, entries: [] }).expect(403);
  });

  void it("checks mission permissions for missions and Data Package permissions for packages", async () => {
    const packages = eventUrl("/data-packages");
    const packageEditor = await user("Packages", ["data-packages.read", "data-packages.edit"]);
    await request(app).post(packages).set("Cookie", packageEditor.cookie).send({ name: "Plan", kind: "mission" }).expect(403);
    const created = (await request(app).post(packages).set("Cookie", packageEditor.cookie).send({ name: "Maps" }).expect(201)).body as { id: string };

    const planner = await user("Planner", ["missions.read", "missions.edit"]);
    const mission = (await request(app).post(packages).set("Cookie", planner.cookie).send({ name: "Plan", kind: "mission" }).expect(201)).body as {
      id: string;
    };
    await request(app).post(packages).set("Cookie", planner.cookie).send({ name: "Other maps" }).expect(403);

    const listed = (await request(app).get(packages).set("Cookie", planner.cookie).expect(200)).body as { items: Array<{ id: string }> };
    assert.deepEqual(listed.items.map(({ id }) => id), [mission.id], "a mission planner lists only missions");
    await request(app).get(`${packages}?kind=package`).set("Cookie", planner.cookie).expect(403);
    await request(app).get(`${packages}/${created.id}`).set("Cookie", planner.cookie).expect(403);
    await request(app).get(`${packages}/${mission.id}`).set("Cookie", packageEditor.cookie).expect(403);
    await request(app).get(`${packages}/${mission.id}`).set("Cookie", planner.cookie).expect(200);
  });

  void it("keeps the preset library behind its own instance-wide permissions", async () => {
    const manager = await createUser("Manager", [{ permission: "events.manage" }]);
    await request(app).get("/api/v1/presets").set("Cookie", manager.cookie).expect(403);

    const reader = await createUser("Reader", [{ permission: "presets.read" }]);
    await request(app).get("/api/v1/presets").set("Cookie", reader.cookie).expect(200);
    const document = { format: "openmeshtak-preset", formatVersion: 1, kind: "tak", name: "Camp", tak: { atakPreferences: [] } };
    await request(app).post("/api/v1/presets").set("Cookie", reader.cookie).send({ document }).expect(403);

    const librarian = await createUser("Librarian", [{ permission: "presets.manage" }]);
    await request(app).post("/api/v1/presets").set("Cookie", librarian.cookie).send({ document }).expect(201);
  });
});
