import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { after, beforeEach, describe, it } from "node:test";
import type { Express } from "express";
import { strToU8, unzipSync, zipSync } from "fflate";
import request from "supertest";
import { createApp } from "../src/app.js";
import { config } from "../src/shared/config/config.js";
import { PERMISSIONS } from "../src/shared/auth/permissions.js";
import { database, disconnectDatabase } from "../src/shared/database/database.js";
import { clearDatabase, createEvent, createUser, type TestUser } from "./support/identity.js";
import { manifest, spotMarker } from "./support/cot-fixtures.js";

const temporary = mkdtempSync(join(tmpdir(), "omtk-tiles-"));

/** A tiny ATAK-style SQLite tile cache, built in a temporary file and read back as bytes. */
function tileCache(provider: string): Uint8Array {
  const path = join(temporary, `${provider}.sqlite`);
  rmSync(path, { force: true });
  const db = new DatabaseSync(path);
  db.exec("CREATE TABLE tiles (key INTEGER PRIMARY KEY, provider TEXT, tile BLOB)");
  db.exec("CREATE TABLE ATAK_metadata (key TEXT, value TEXT)");
  db.prepare("INSERT INTO tiles VALUES (?, ?, ?)").run(1, provider, Buffer.from([0x89, 0x50, 0x4e, 0x47]));
  db.prepare("INSERT INTO ATAK_metadata VALUES (?, ?)").run("srid", "3857");
  db.close();
  return new Uint8Array(readFileSync(path));
}

const topo = tileCache("topo");
const satellite = tileCache("satellite");

function packageZip(extra: Record<string, Uint8Array>): Buffer {
  return Buffer.from(
    zipSync({
      "MANIFEST/manifest.xml": strToU8(manifest("Maps", ["11111111-1111-4111-8111-111111111111"])),
      "11111111-1111-4111-8111-111111111111/11111111-1111-4111-8111-111111111111.cot": strToU8(spotMarker),
      ...extra,
    }),
  );
}

let app: Express;
let admin: TestUser;
let eventId: string;

async function createPackage(name: string): Promise<{ url: string; id: string; layerId: string }> {
  const created = await request(app).post(`/api/v1/events/${eventId}/data-packages`).set("Cookie", admin.cookie).send({ name }).expect(201);
  const id = (created.body as { id: string }).id;
  const url = `/api/v1/events/${eventId}/data-packages/${id}`;
  const layers = await request(app).get(`${url}/layers`).set("Cookie", admin.cookie).expect(200);
  return { url, id, layerId: (layers.body as { items: Array<{ id: string }> }).items[0]?.id ?? "" };
}

function importZip(target: { url: string; layerId: string }, body: Buffer): request.Test {
  return request(app)
    .post(`${target.url}/layers/${target.layerId}/import/atak`)
    .set("Cookie", admin.cookie)
    .set("Content-Type", "application/zip")
    .send(body);
}

function binary(test: request.Test): request.Test {
  return test.buffer(true).parse((res, callback) => {
    const chunks: Buffer[] = [];
    res.on("data", (chunk: Buffer) => chunks.push(chunk));
    res.on("end", () => callback(null, Buffer.concat(chunks)));
  });
}

async function publishAndExport(target: { url: string }): Promise<Record<string, Uint8Array>> {
  await request(app).post(`${target.url}/revisions`).set("Cookie", admin.cookie).expect(200);
  const response = await binary(request(app).get(`${target.url}/revisions/1/atak`).set("Cookie", admin.cookie)).expect(200);
  return unzipSync(new Uint8Array(response.body as Buffer));
}

void describe("map content in data packages", () => {
  beforeEach(async () => {
    await clearDatabase();
    app = createApp();
    admin = await createUser("Admin", PERMISSIONS.map((permission) => ({ permission })));
    eventId = await createEvent();
  });

  after(async () => {
    rmSync(temporary, { recursive: true, force: true });
    await clearDatabase();
    await disconnectDatabase();
  });

  void it("retains offline maps and nested map packages and skips other attachments", async () => {
    const target = await createPackage("Maps");
    const nested = zipSync({ "MANIFEST/manifest.xml": strToU8(manifest("Inner", [])), "inner/map.sqlite": topo });
    const report = (
      await importZip(target, packageZip({ "maps/topo.sqlite": topo, "nested/inner.sqlite": nested, "notes.txt": strToU8("hi") })).expect(200)
    ).body as { accepted: number; retained: Array<{ feature: string }>; skipped: Array<{ feature: string }> };

    assert.equal(report.accepted, 1);
    assert.deepEqual(report.retained.map(({ feature }) => feature).sort(), ["maps/topo.sqlite", "nested/inner.sqlite"]);
    assert.deepEqual(report.skipped.map(({ feature }) => feature), ["notes.txt"]);
    assert.deepEqual(
      (await database.packageContent.findMany({ orderBy: { archivePath: "asc" } })).map(({ kind }) => kind),
      ["offline-map", "nested-data-package"],
    );
  });

  void it("exports retained content byte for byte and listed in the manifest", async () => {
    const target = await createPackage("Maps");
    await importZip(target, packageZip({ "maps/topo.sqlite": topo })).expect(200);

    const files = await publishAndExport(target);
    assert.deepEqual(files["maps/topo.sqlite"], topo);
    assert.match(new TextDecoder().decode(files["MANIFEST/manifest.xml"]), /zipEntry="maps\/topo\.sqlite"/);
  });

  void it("refuses to export content whose stored bytes changed", async () => {
    const target = await createPackage("Maps");
    await importZip(target, packageZip({ "maps/topo.sqlite": topo })).expect(200);
    await request(app).post(`${target.url}/revisions`).set("Cookie", admin.cookie).expect(200);

    const content = await database.packageContent.findFirstOrThrow({ where: { packageId: target.id }, include: { blob: true } });
    const blob = content.blob;
    writeFileSync(resolve(config.dataDirectory, "storage", blob.storageKey), satellite);
    await request(app).get(`${target.url}/revisions/1/atak`).set("Cookie", admin.cookie).expect(500);
  });

  void it("includes the same map once in a combined export and keeps different maps apart", async () => {
    const alpha = await createPackage("Alpha");
    const bravo = await createPackage("Bravo");
    await importZip(alpha, packageZip({ "maps/area.sqlite": topo })).expect(200);
    await importZip(bravo, packageZip({ "maps/area.sqlite": satellite, "maps/topo.sqlite": topo })).expect(200);
    await request(app).post(`${alpha.url}/revisions`).set("Cookie", admin.cookie).expect(200);
    await request(app).post(`${bravo.url}/revisions`).set("Cookie", admin.cookie).expect(200);

    const response = await binary(
      request(app)
        .post(`/api/v1/events/${eventId}/data-package-exports/atak`)
        .set("Cookie", admin.cookie)
        .send({ packages: [{ packageId: alpha.id }, { packageId: bravo.id }] }),
    ).expect(200);
    const files = unzipSync(new Uint8Array(response.body as Buffer));
    const maps = Object.keys(files).filter((path) => path.endsWith(".sqlite")).sort();

    assert.deepEqual(maps, [`${bravo.id}/maps/area.sqlite`, "maps/area.sqlite", "maps/topo.sqlite"]);
    assert.deepEqual(files["maps/area.sqlite"], topo);
    assert.deepEqual(files[`${bravo.id}/maps/area.sqlite`], satellite);
  });

  void it("keeps map content when published layers are copied into a new package", async () => {
    const source = await createPackage("Source");
    await importZip(source, packageZip({ "maps/topo.sqlite": topo })).expect(200);
    await request(app).post(`${source.url}/revisions`).set("Cookie", admin.cookie).expect(200);

    const copy = await request(app)
      .post(`/api/v1/events/${eventId}/data-package-copies`)
      .set("Cookie", admin.cookie)
      .send({ name: "Copy", packages: [{ packageId: source.id }] })
      .expect(201);
    const copyId = (copy.body as { id: string }).id;

    const contents = await database.packageContent.findMany({ where: { packageId: copyId } });
    assert.equal(contents.length, 1);
    assert.equal(contents[0]?.blobId, (await database.packageContent.findFirstOrThrow({ where: { packageId: source.id } })).blobId);
  });

  void it("deletes stored files with the package unless a copy still uses them", async () => {
    const source = await createPackage("Source");
    await importZip(source, packageZip({ "maps/topo.sqlite": topo })).expect(200);
    await request(app).post(`${source.url}/revisions`).set("Cookie", admin.cookie).expect(200);
    const blob = (await database.packageContent.findFirstOrThrow({ where: { packageId: source.id }, include: { blob: true } })).blob;
    const file = resolve(config.dataDirectory, "storage", blob.storageKey);

    const copy = await request(app)
      .post(`/api/v1/events/${eventId}/data-package-copies`)
      .set("Cookie", admin.cookie)
      .send({ name: "Copy", packages: [{ packageId: source.id }] })
      .expect(201);
    await request(app).delete(source.url).set("Cookie", admin.cookie).expect(204);
    assert.equal(existsSync(file), true, "the copy still uses the file");

    await request(app).delete(`/api/v1/events/${eventId}/data-packages/${(copy.body as { id: string }).id}`).set("Cookie", admin.cookie).expect(204);
    assert.equal(existsSync(file), false);
    assert.equal(await database.storageBlob.count(), 0);
  });

  void it("keeps files of a deleted layer while a published revision still uses them", async () => {
    const target = await createPackage("Maps");
    await importZip(target, packageZip({ "maps/topo.sqlite": topo })).expect(200);
    await request(app).post(`${target.url}/revisions`).set("Cookie", admin.cookie).expect(200);
    const second = await request(app).post(`${target.url}/layers`).set("Cookie", admin.cookie).send({ name: "Other" }).expect(201);
    assert.ok((second.body as { id: string }).id);

    await request(app).delete(`${target.url}/layers/${target.layerId}`).set("Cookie", admin.cookie).expect(204);
    assert.equal(await database.storageBlob.count(), 1);
    await request(app).get(`${target.url}/revisions/1/atak`).set("Cookie", admin.cookie).expect(200);
  });

  void it("keeps rubber sheets, lists their corners and serves their image", async () => {
    const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3]);
    const kml = `<?xml version="1.0" encoding="utf-8"?>
<kml xmlns:gx="http://www.google.com/kml/ext/2.2" xmlns="http://www.opengis.net/kml/2.2">
  <GroundOverlay><name>Game map</name><Icon><href>files/image.Png</href></Icon>
    <gx:LatLonQuad><coordinates>11.81,52.37 11.84,52.37 11.84,52.38 11.81,52.38</coordinates></gx:LatLonQuad>
  </GroundOverlay>
</kml>`;
    const kmz = zipSync({ "doc.kml": strToU8(kml), "files/image.Png": png });
    const notASheet = zipSync({ "doc.kml": strToU8("<kml><Placemark/></kml>") });
    const target = await createPackage("Sheets");
    const report = (
      await importZip(target, packageZip({ "sheet/DE_2024.kmz": kmz, "other/places.kmz": notASheet })).expect(200)
    ).body as { retained: Array<{ feature: string }>; skipped: Array<{ feature: string }> };
    assert.deepEqual(report.retained.map(({ feature }) => feature), ["sheet/DE_2024.kmz"]);
    assert.deepEqual(report.skipped.map(({ feature }) => feature), ["other/places.kmz"]);

    const contents = (await request(app).get(`${target.url}/contents`).set("Cookie", admin.cookie).expect(200)).body as Array<{
      id: string;
      kind: string;
      name: string;
      rubberSheet: { corners: number[][]; imageMediaType: string } | null;
    }>;
    assert.equal(contents[0]?.kind, "rubber-sheet");
    assert.equal(contents[0]?.name, "Game map");
    assert.deepEqual(contents[0]?.rubberSheet, {
      corners: [[11.81, 52.37], [11.84, 52.37], [11.84, 52.38], [11.81, 52.38]],
      imageMediaType: "image/png",
    });

    const image = await binary(request(app).get(`${target.url}/contents/${contents[0]?.id ?? ""}/image`).set("Cookie", admin.cookie)).expect(200);
    assert.equal(image.headers["content-type"], "image/png");
    assert.deepEqual(new Uint8Array(image.body as Buffer), png);

    const files = await publishAndExport(target);
    assert.deepEqual(files["sheet/DE_2024.kmz"], kmz);
  });
});
