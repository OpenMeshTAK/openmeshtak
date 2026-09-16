import assert from "node:assert/strict";
import { after, beforeEach, describe, it } from "node:test";
import type { Express } from "express";
import { strFromU8, unzipSync } from "fflate";
import request from "supertest";
import { createApp } from "../src/app.js";
import { disconnectDatabase } from "../src/shared/database/database.js";
import { circle, dataPackageZip, freeformArea, route, spotMarker } from "./support/cot-fixtures.js";
import { clearDatabase, createEvent, createUser, type TestUser } from "./support/identity.js";

interface ReportBody {
  accepted: number;
  changed: Array<{ feature: string; message: string }>;
  skipped: Array<{ feature: string; message: string }>;
  rejected: Array<{ feature: string; message: string }>;
}

let app: Express;
let editor: TestUser;
let packageUrl: string;
let layerId: string;

function importZip(body: Buffer, contentType = "application/zip"): request.Test {
  return request(app)
    .post(`${packageUrl}/layers/${layerId}/import/atak`)
    .set("Cookie", editor.cookie)
    .set("Content-Type", contentType)
    .send(body);
}

function binary(response: request.Response): Buffer {
  return response.body as Buffer;
}

async function download(url: string): Promise<request.Response> {
  return request(app)
    .get(url)
    .set("Cookie", editor.cookie)
    .buffer(true)
    .parse((response, callback) => {
      const chunks: Buffer[] = [];
      response.on("data", (chunk: Buffer) => chunks.push(chunk));
      response.on("end", () => callback(null, Buffer.concat(chunks)));
    })
    .expect(200);
}

void describe("ATAK Data Package import and export", () => {
  beforeEach(async () => {
    await clearDatabase();
    app = createApp();
    const eventId = await createEvent();
    editor = await createUser("Editor", [
      { permission: "data-packages.read", eventId },
      { permission: "data-packages.edit", eventId },
      { permission: "data-packages.publish", eventId },
    ]);
    const created = await request(app)
      .post(`/api/v1/events/${eventId}/data-packages`)
      .set("Cookie", editor.cookie)
      .send({ name: "LS-2026" })
      .expect(201);
    packageUrl = `/api/v1/events/${eventId}/data-packages/${(created.body as { id: string }).id}`;
    const layers = await request(app).get(`${packageUrl}/layers`).set("Cookie", editor.cookie).expect(200);
    layerId = (layers.body as { items: Array<{ id: string }> }).items[0]?.id ?? "";
  });

  after(async () => {
    await clearDatabase();
    await disconnectDatabase();
  });

  void it("imports markers, shapes and circles and reports everything else", async () => {
    const zip = dataPackageZip(
      { a: spotMarker, b: freeformArea, c: circle, d: route },
      { "attachments/photo.jpg": "not really a photo" },
    );
    const report = (await importZip(zip).expect(200)).body as ReportBody;

    assert.equal(report.accepted, 3);
    assert.deepEqual(report.changed.map(({ feature }) => feature), ["WATCH"]);
    assert.deepEqual(report.skipped.map(({ feature }) => feature).sort(), ["attachments/photo.jpg", "d.cot"]);
    assert.deepEqual(report.rejected, []);
  });

  void it("accepts a single CoT file", async () => {
    const report = (await importZip(Buffer.from(spotMarker), "application/xml").expect(200)).body as ReportBody;
    assert.equal(report.accepted, 1);
  });

  void it("rejects unreadable archives and JSON uploads", async () => {
    const broken = Buffer.concat([Buffer.from("PK"), Buffer.alloc(64)]);
    const response = await importZip(broken).expect(422);
    assert.equal((response.body as { code: string }).code, "INVALID_ARCHIVE");
    await request(app)
      .post(`${packageUrl}/layers/${layerId}/import/atak`)
      .set("Cookie", editor.cookie)
      .send({ type: "FeatureCollection" })
      .expect(415);
  });

  void it("exports a published revision as a Data Package that imports again", async () => {
    await importZip(dataPackageZip({ a: spotMarker, b: freeformArea, c: circle })).expect(200);
    await request(app).post(`${packageUrl}/revisions`).set("Cookie", editor.cookie).expect(200);

    const response = await download(`${packageUrl}/revisions/1/atak`);
    assert.equal(response.headers["content-type"], "application/zip");
    assert.match(String(response.headers["content-disposition"]), /attachment; filename="LS-2026-r1\.zip"/);

    const files = unzipSync(new Uint8Array(binary(response)));
    const manifest = strFromU8(files["MANIFEST/manifest.xml"] ?? new Uint8Array());
    assert.match(manifest, /<MissionPackageManifest version="2">/);
    assert.match(manifest, /<Parameter name="name" value="LS-2026"/);
    const cotFiles = Object.keys(files).filter((path) => path.endsWith(".cot"));
    assert.equal(cotFiles.length, 3);

    const again = (await importZip(binary(response)).expect(200)).body as ReportBody;
    assert.equal(again.accepted, 3);
    assert.deepEqual(again.rejected, []);

    const second = await download(`${packageUrl}/revisions/1/atak`);
    assert.deepEqual(binary(second), binary(response), "the same revision must produce identical bytes");
  });
});
