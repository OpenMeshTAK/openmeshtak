import assert from "node:assert/strict";
import { after, beforeEach, describe, it } from "node:test";
import type { Express } from "express";
import request from "supertest";
import { createApp } from "../src/app.js";
import { geometryProblems } from "../src/modules/data-packages/geometry.js";
import type { PackageGeometry } from "../src/modules/data-packages/package-object.dto.js";
import { disconnectDatabase } from "../src/shared/database/database.js";
import { clearDatabase, createEvent, createUser, type TestUser } from "./support/identity.js";

interface ObjectBody {
  id: string;
  kind: string;
  geometry: PackageGeometry;
  style: { color: string };
  version: number;
}

const square: PackageGeometry = {
  type: "Polygon",
  coordinates: [[[8.0, 50.0], [8.1, 50.0], [8.1, 50.1], [8.0, 50.1], [8.0, 50.0]]],
};

function codeFor(geometry: PackageGeometry): string | undefined {
  return geometryProblems(geometry)[0]?.code;
}

void describe("data package geometry validation", () => {
  void it("accepts points, lines and closed polygons in WGS84", () => {
    assert.equal(codeFor({ type: "Point", coordinates: [8.68, 50.11, 112.5] }), undefined);
    assert.equal(codeFor({ type: "LineString", coordinates: [[8.0, 50.0], [8.2, 50.2], [8.0, 50.2], [8.2, 50.0]] }), undefined);
    assert.equal(codeFor(square), undefined);
  });

  void it("rejects positions outside WGS84 ranges", () => {
    assert.equal(codeFor({ type: "Point", coordinates: [181, 0] }), "INVALID_POSITION");
    assert.equal(codeFor({ type: "Point", coordinates: [0, -91] }), "INVALID_POSITION");
    assert.equal(codeFor({ type: "Point", coordinates: [0] }), "INVALID_POSITION");
  });

  void it("rejects unclosed, too short and self-intersecting polygons", () => {
    assert.equal(codeFor({ type: "Polygon", coordinates: [[[8, 50], [8.1, 50], [8.1, 50.1], [8, 50.1]]] }), "INVALID_SHAPE");
    assert.equal(codeFor({ type: "LineString", coordinates: [[8, 50]] }), "INVALID_SHAPE");
    const bowtie: PackageGeometry = {
      type: "Polygon",
      coordinates: [[[8, 50], [8.1, 50.1], [8.1, 50], [8, 50.1], [8, 50]]],
    };
    assert.equal(codeFor(bowtie), "SELF_INTERSECTION");
  });

  void it("accepts circles with a radius in metres and rejects impossible radii", () => {
    assert.equal(codeFor({ type: "Circle", coordinates: [11.8144873, 52.3837630], radius: 46.38 }), undefined);
    assert.equal(codeFor({ type: "Circle", coordinates: [11.8, 52.3], radius: 0 }), "INVALID_SHAPE");
    assert.equal(codeFor({ type: "Circle", coordinates: [11.8, 52.3], radius: 250_000 }), "INVALID_SHAPE");
    assert.equal(codeFor({ type: "Circle", coordinates: [179.99, 0], radius: 5_000 }), "CROSSES_ANTIMERIDIAN");
  });

  void it("rejects geometry crossing the antimeridian", () => {
    assert.equal(codeFor({ type: "LineString", coordinates: [[179.5, 10], [-179.5, 10]] }), "CROSSES_ANTIMERIDIAN");
  });
});

let app: Express;
let editor: TestUser;
let eventId: string;
let packageUrl: string;
let layerId: string;

void describe("data package objects", () => {
  beforeEach(async () => {
    await clearDatabase();
    app = createApp();
    eventId = await createEvent();
    editor = await createUser("Editor", [
      { permission: "data-packages.read", eventId },
      { permission: "data-packages.edit", eventId },
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

  void it("stores objects with their exact coordinates and unknown altitude", async () => {
    const created = await request(app)
      .post(`${packageUrl}/objects`)
      .set("Cookie", editor.cookie)
      .send({ layerId, name: "Rally point", geometry: { type: "Point", coordinates: [8.682127, 50.110924] } })
      .expect(201);
    const point = created.body as ObjectBody;
    assert.equal(point.kind, "point");
    assert.deepEqual(point.geometry.coordinates, [8.682127, 50.110924]);
    assert.equal(point.style.color, "#1E88E5");

    const area = await request(app)
      .post(`${packageUrl}/objects`)
      .set("Cookie", editor.cookie)
      .send({ layerId, name: "Assembly area", geometry: square, style: { color: "#E53935", strokeWidth: 2, fillOpacity: 0.4 } })
      .expect(201);
    assert.equal((area.body as ObjectBody).kind, "polygon");

    const list = await request(app).get(`${packageUrl}/objects`).query({ layerId }).set("Cookie", editor.cookie).expect(200);
    assert.equal((list.body as { items: unknown[] }).items.length, 2);
  });

  void it("reports invalid geometry as a validation problem on the geometry field", async () => {
    const response = await request(app)
      .post(`${packageUrl}/objects`)
      .set("Cookie", editor.cookie)
      .send({ layerId, name: "Broken", geometry: { type: "Point", coordinates: [200, 0] } })
      .expect(422);
    const body = response.body as { code: string; errors: Array<{ field: string; code: string }> };
    assert.equal(body.code, "VALIDATION_FAILED");
    assert.deepEqual(body.errors.map(({ field, code }) => ({ field, code })), [{ field: "geometry", code: "INVALID_POSITION" }]);
  });

  void it("updates with optimistic concurrency and protects locked layers", async () => {
    const created = await request(app)
      .post(`${packageUrl}/objects`)
      .set("Cookie", editor.cookie)
      .send({ layerId, name: "Rally point", geometry: { type: "Point", coordinates: [8, 50] } })
      .expect(201);
    const object = created.body as ObjectBody;
    const update = {
      version: 1,
      layerId,
      name: "Moved rally point",
      description: null,
      geometry: { type: "Point", coordinates: [8.1, 50.1, 120] },
      style: object.style,
    };

    await request(app).put(`${packageUrl}/objects/${object.id}`).set("Cookie", editor.cookie).send(update).expect(200);
    await request(app).put(`${packageUrl}/objects/${object.id}`).set("Cookie", editor.cookie).send(update).expect(409);

    await request(app)
      .put(`${packageUrl}/layers/${layerId}`)
      .set("Cookie", editor.cookie)
      .send({ version: 1, name: "Layer 1", sortOrder: 0, visible: true, locked: true })
      .expect(200);
    const locked = await request(app).delete(`${packageUrl}/objects/${object.id}`).set("Cookie", editor.cookie).expect(409);
    assert.equal((locked.body as { code: string }).code, "LAYER_LOCKED");
  });

  void it("rejects layers of another data package", async () => {
    const other = await request(app)
      .post(`/api/v1/events/${eventId}/data-packages`)
      .set("Cookie", editor.cookie)
      .send({ name: "Other" })
      .expect(201);
    const otherLayers = await request(app)
      .get(`/api/v1/events/${eventId}/data-packages/${(other.body as { id: string }).id}/layers`)
      .set("Cookie", editor.cookie)
      .expect(200);
    const foreignLayer = (otherLayers.body as { items: Array<{ id: string }> }).items[0]?.id;

    await request(app)
      .post(`${packageUrl}/objects`)
      .set("Cookie", editor.cookie)
      .send({ layerId: foreignLayer, name: "Sneaky", geometry: { type: "Point", coordinates: [8, 50] } })
      .expect(422);
  });
});
