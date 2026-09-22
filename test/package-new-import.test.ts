import assert from "node:assert/strict";
import { after, beforeEach, describe, it } from "node:test";
import type { Express } from "express";
import request from "supertest";
import { createApp } from "../src/app.js";
import { database, disconnectDatabase } from "../src/shared/database/database.js";
import { clearDatabase, createEvent, createUser, type TestUser } from "./support/identity.js";
import { dataPackageZip, spotMarker } from "./support/cot-fixtures.js";

interface ImportedBody {
  dataPackage: { id: string; name: string; latestRevision: number | null };
  report: { accepted: number };
}

let app: Express;
let editor: TestUser;
let eventId: string;

function importUrl(fileName?: string): string {
  const query = fileName === undefined ? "" : `?fileName=${encodeURIComponent(fileName)}`;
  return `/api/v1/events/${eventId}/data-package-imports/atak${query}`;
}

void describe("importing a data package as a new package", () => {
  beforeEach(async () => {
    await clearDatabase();
    app = createApp();
    eventId = await createEvent();
    editor = await createUser("Editor", [
      { permission: "data-packages.read", eventId },
      { permission: "data-packages.edit", eventId },
    ]);
  });

  after(async () => {
    await clearDatabase();
    await disconnectDatabase();
  });

  void it("creates a draft package named after the manifest with the imported objects", async () => {
    const response = await request(app)
      .post(importUrl("ignored.zip"))
      .set("Cookie", editor.cookie)
      .set("Content-Type", "application/zip")
      .send(dataPackageZip({ a: spotMarker }))
      .expect(201);
    const body = response.body as ImportedBody;

    assert.equal(body.dataPackage.name, "Synthetic");
    assert.equal(body.dataPackage.latestRevision, null);
    assert.equal(body.report.accepted, 1);
    assert.equal(await database.packageObject.count({ where: { packageId: body.dataPackage.id } }), 1);
  });

  void it("falls back to the file name for a single CoT file", async () => {
    const response = await request(app)
      .post(importUrl("Rally point.cot"))
      .set("Cookie", editor.cookie)
      .set("Content-Type", "application/xml")
      .send(spotMarker)
      .expect(201);
    assert.equal((response.body as ImportedBody).dataPackage.name, "Rally point");
  });

  void it("creates nothing for an unreadable archive or without edit permission", async () => {
    const broken = Buffer.concat([Buffer.from("PK"), Buffer.alloc(32)]);
    await request(app).post(importUrl()).set("Cookie", editor.cookie).set("Content-Type", "application/zip").send(broken).expect(422);

    const reader = await createUser("Reader", [{ permission: "data-packages.read", eventId }]);
    await request(app)
      .post(importUrl())
      .set("Cookie", reader.cookie)
      .set("Content-Type", "application/zip")
      .send(dataPackageZip({ a: spotMarker }))
      .expect(403);
    assert.equal(await database.dataPackage.count({ where: { eventId } }), 0);
  });
});
