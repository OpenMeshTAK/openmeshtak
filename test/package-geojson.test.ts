import assert from "node:assert/strict";
import { after, beforeEach, describe, it } from "node:test";
import type { Express } from "express";
import request from "supertest";
import { createApp } from "../src/app.js";
import { disconnectDatabase } from "../src/shared/database/database.js";
import { clearDatabase, createEvent, createUser, type TestUser } from "./support/identity.js";

interface ReportBody {
  accepted: number;
  changed: Array<{ feature: string; message: string }>;
  skipped: Array<{ feature: string; message: string }>;
  rejected: Array<{ feature: string; message: string }>;
}

interface CollectionBody {
  type: string;
  features: Array<{ geometry: { type: string; coordinates: unknown }; properties: Record<string, unknown> }>;
}

let app: Express;
let editor: TestUser;
let packageUrl: string;
let layerId: string;

const upload = {
  type: "FeatureCollection",
  features: [
    {
      type: "Feature",
      geometry: { type: "Point", coordinates: [8.68, 50.11, 112] },
      properties: { name: "Rally point", "marker-color": "#e53935" },
    },
    {
      type: "Feature",
      geometry: { type: "MultiPoint", coordinates: [[8.7, 50.1], [8.71, 50.12]] },
      properties: { name: "Checkpoints", "stroke-width": 50 },
    },
    { type: "Feature", geometry: { type: "GeometryCollection", geometries: [] }, properties: {} },
    {
      type: "Feature",
      geometry: { type: "Polygon", coordinates: [[[8, 50], [8.1, 50.1], [8.1, 50], [8, 50.1], [8, 50]]] },
      properties: { name: "Bowtie" },
    },
    { type: "Feature", geometry: null, properties: { name: "Note only" } },
  ],
};

void describe("data package GeoJSON import and export", () => {
  beforeEach(async () => {
    await clearDatabase();
    app = createApp();
    const eventId = await createEvent();
    editor = await createUser("Editor", [
      { permission: "data-packages.read", eventId },
      { permission: "data-packages.edit", eventId },
      { permission: "data-packages.publish", eventId },
    ]);
    const dataPackage = await request(app)
      .post(`/api/v1/events/${eventId}/data-packages`)
      .set("Cookie", editor.cookie)
      .send({ name: "Phoenix" })
      .expect(201);
    packageUrl = `/api/v1/events/${eventId}/data-packages/${(dataPackage.body as { id: string }).id}`;
    const layers = await request(app).get(`${packageUrl}/layers`).set("Cookie", editor.cookie).expect(200);
    layerId = (layers.body as { items: Array<{ id: string }> }).items[0]?.id ?? "";
  });

  after(async () => {
    await clearDatabase();
    await disconnectDatabase();
  });

  void it("imports supported features and reports everything else", async () => {
    const response = await request(app)
      .post(`${packageUrl}/layers/${layerId}/import`)
      .set("Cookie", editor.cookie)
      .send(upload)
      .expect(200);
    const report = response.body as ReportBody;

    assert.equal(report.accepted, 3);
    assert.deepEqual(report.changed.map(({ feature }) => feature), ["Feature 2 (Checkpoints)"]);
    assert.match(report.changed[0]?.message ?? "", /split into 2 objects/);
    assert.match(report.changed[0]?.message ?? "", /stroke width 50 became 20/);
    assert.deepEqual(report.skipped.map(({ feature }) => feature), ["Feature 3", "Feature 5 (Note only)"]);
    assert.deepEqual(report.rejected.map(({ feature }) => feature), ["Feature 4 (Bowtie)"]);
  });

  void it("keeps circles through a GeoJSON round trip", async () => {
    await request(app)
      .post(`${packageUrl}/objects`)
      .set("Cookie", editor.cookie)
      .send({ layerId, name: "NACHTWACHE", geometry: { type: "Circle", coordinates: [11.8144873, 52.383763], radius: 46.38 } })
      .expect(201);
    const exported = await request(app).get(`${packageUrl}/geojson`).set("Cookie", editor.cookie).expect(200);
    const feature = (exported.body as CollectionBody).features[0];
    assert.equal(feature?.geometry.type, "Point");
    assert.equal(feature?.properties.shape, "circle");
    assert.equal(feature?.properties.radius, 46.38);

    const report = await request(app)
      .post(`${packageUrl}/layers/${layerId}/import`)
      .set("Cookie", editor.cookie)
      .send(exported.body)
      .expect(200);
    assert.equal((report.body as ReportBody).accepted, 1);
    const objects = await request(app).get(`${packageUrl}/objects`).set("Cookie", editor.cookie).expect(200);
    const kinds = (objects.body as { items: Array<{ kind: string }> }).items.map(({ kind }) => kind);
    assert.deepEqual(kinds, ["circle", "circle"]);
  });

  void it("rejects documents that are not GeoJSON without creating anything", async () => {
    const response = await request(app)
      .post(`${packageUrl}/layers/${layerId}/import`)
      .set("Cookie", editor.cookie)
      .send({ type: "Topology", objects: {} })
      .expect(200);
    const report = response.body as ReportBody;
    assert.equal(report.accepted, 0);
    assert.equal(report.skipped.length, 1);
  });

  void it("exports drafts and revisions with exact coordinates and style properties", async () => {
    await request(app).post(`${packageUrl}/layers/${layerId}/import`).set("Cookie", editor.cookie).send(upload).expect(200);

    const draft = await request(app).get(`${packageUrl}/geojson`).set("Cookie", editor.cookie).expect(200);
    const collection = draft.body as CollectionBody;
    assert.equal(collection.type, "FeatureCollection");
    assert.equal(collection.features.length, 3);
    assert.deepEqual(collection.features[0]?.geometry.coordinates, [8.68, 50.11, 112]);
    assert.equal(collection.features[0]?.properties["marker-color"], "#E53935");
    assert.equal(collection.features[0]?.properties.layer, "Layer 1");

    await request(app).post(`${packageUrl}/revisions`).set("Cookie", editor.cookie).expect(200);
    const revision = await request(app).get(`${packageUrl}/revisions/1/geojson`).set("Cookie", editor.cookie).expect(200);
    assert.deepEqual(revision.body, draft.body);

    const kml = await request(app).get(`${packageUrl}/revisions/1/kml`).set("Cookie", editor.cookie).expect(200);
    assert.match(String(kml.headers["content-type"]), /application\/vnd\.google-earth\.kml\+xml/);
    assert.match(kml.text, /<coordinates>8\.68,50\.11,112<\/coordinates>/);
    assert.equal((kml.text.match(/<Placemark /g) ?? []).length, 3);
  });
});
