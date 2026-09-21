import assert from "node:assert/strict";
import { after, beforeEach, describe, it } from "node:test";
import type { Express } from "express";
import request from "supertest";
import { createApp } from "../src/app.js";
import { readDataPackage } from "../src/modules/data-packages/atak/data-package-archive.js";
import { PERMISSIONS } from "../src/shared/auth/permissions.js";
import { database, disconnectDatabase } from "../src/shared/database/database.js";
import { clearDatabase, createEvent, createUser, type TestUser } from "./support/identity.js";

let app: Express;
let admin: TestUser;
let eventId: string;

function exportUrl(path = ""): string {
  return `/api/v1/events/${eventId}/data-package-exports/atak${path}`;
}

/** Creates a package with one named point in its default layer and optionally publishes it. */
async function createPackage(name: string, objectName: string, publish: boolean): Promise<{ id: string; layerId: string }> {
  const created = await request(app)
    .post(`/api/v1/events/${eventId}/data-packages`)
    .set("Cookie", admin.cookie)
    .send({ name })
    .expect(201);
  const packageUrl = `/api/v1/events/${eventId}/data-packages/${(created.body as { id: string }).id}`;
  const layers = await request(app).get(`${packageUrl}/layers`).set("Cookie", admin.cookie).expect(200);
  const layerId = (layers.body as { items: Array<{ id: string }> }).items[0]?.id ?? "";
  await request(app)
    .post(`${packageUrl}/objects`)
    .set("Cookie", admin.cookie)
    .send({ layerId, name: objectName, geometry: { type: "Point", coordinates: [8.68, 50.11] } })
    .expect(201);
  if (publish) {
    await request(app).post(`${packageUrl}/revisions`).set("Cookie", admin.cookie).expect(200);
  }
  return { id: (created.body as { id: string }).id, layerId };
}

function binary(test: request.Test): request.Test {
  return test.buffer(true).parse((res, callback) => {
    const chunks: Buffer[] = [];
    res.on("data", (chunk: Buffer) => chunks.push(chunk));
    res.on("end", () => callback(null, Buffer.concat(chunks)));
  });
}

void describe("combined Data Package export", () => {
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

  void it("reports included, skipped and equally named content", async () => {
    const alpha = await createPackage("Alpha", "Rally", true);
    const bravo = await createPackage("Bravo", "Rally", true);
    const draft = await createPackage("Draft", "Other", false);

    const report = await request(app)
      .post(exportUrl("/preview"))
      .set("Cookie", admin.cookie)
      .send({ packages: [{ packageId: alpha.id }, { packageId: bravo.id }, { packageId: draft.id }] })
      .expect(200);
    assert.deepEqual(report.body, {
      included: [
        { packageId: alpha.id, name: "Alpha", revision: 1, objects: 1 },
        { packageId: bravo.id, name: "Bravo", revision: 1, objects: 1 },
      ],
      skipped: [{ packageId: draft.id, name: "Draft", reason: "not-published" }],
      nameClashes: [{ name: "Rally", packageIds: [alpha.id, bravo.id].sort() }],
    });
  });

  void it("builds one Data Package with every object and audits its revisions", async () => {
    const alpha = await createPackage("Alpha", "Rally", true);
    const bravo = await createPackage("Bravo", "Checkpoint", true);

    const response = await binary(
      request(app)
        .post(exportUrl())
        .set("Cookie", admin.cookie)
        .send({ name: "Exercise", packages: [{ packageId: alpha.id }, { packageId: bravo.id, layerIds: [bravo.layerId] }] }),
    ).expect(200);
    assert.match(String(response.headers["content-disposition"]), /Exercise\.zip/);

    const archive = readDataPackage(new Uint8Array(response.body as Buffer));
    assert.equal(archive.name, "Exercise");
    assert.equal(archive.cotFiles.length, 2);
    assert.equal(await database.auditEvent.count({ where: { action: "data-package.combined-exported" } }), 1);
  });

  void it("refuses selections without published content, unknown layers and duplicates", async () => {
    const draft = await createPackage("Draft", "Other", false);
    const nothing = await request(app).post(exportUrl()).set("Cookie", admin.cookie).send({ packages: [{ packageId: draft.id }] }).expect(409);
    assert.equal((nothing.body as { code: string }).code, "NOTHING_TO_EXPORT");

    const alpha = await createPackage("Alpha", "Rally", true);
    await request(app)
      .post(exportUrl("/preview"))
      .set("Cookie", admin.cookie)
      .send({ packages: [{ packageId: alpha.id, layerIds: [draft.layerId] }] })
      .expect(422);
    await request(app)
      .post(exportUrl("/preview"))
      .set("Cookie", admin.cookie)
      .send({ packages: [{ packageId: alpha.id }, { packageId: alpha.id }] })
      .expect(422);
  });

  void it("conceals packages of other events and needs data-packages.read", async () => {
    const alpha = await createPackage("Alpha", "Rally", true);
    const otherEvent = await createEvent();
    await request(app)
      .post(`/api/v1/events/${otherEvent}/data-package-exports/atak/preview`)
      .set("Cookie", admin.cookie)
      .send({ packages: [{ packageId: alpha.id }] })
      .expect(404);

    const outsider = await createUser("Outsider", [{ permission: "events.read", eventId }]);
    await request(app).post(exportUrl("/preview")).set("Cookie", outsider.cookie).send({ packages: [{ packageId: alpha.id }] }).expect(403);
  });
});
