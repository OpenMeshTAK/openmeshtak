import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { after, beforeEach, describe, it } from "node:test";
import type { Express } from "express";
import { strToU8, zipSync } from "fflate";
import request from "supertest";
import { createApp } from "../src/app.js";
import { PERMISSIONS } from "../src/shared/auth/permissions.js";
import { database, disconnectDatabase } from "../src/shared/database/database.js";
import { clearDatabase, createEvent, createUser, type TestUser } from "./support/identity.js";
import { manifest, spotMarker } from "./support/cot-fixtures.js";

const temporary = mkdtempSync(join(tmpdir(), "omtk-offline-"));
const png = (marker: number): Buffer => Buffer.from([0x89, 0x50, 0x4e, 0x47, marker]);

/** An ATAK-style tile cache with three zoom-13 tiles, keys packed as ((z * 2^z) + x) * 2^z + y. */
function tileCache(): Uint8Array {
  const path = join(temporary, "tiles.sqlite");
  rmSync(path, { force: true });
  const db = new DatabaseSync(path);
  db.exec("CREATE TABLE tiles (key INTEGER PRIMARY KEY, provider TEXT, tile BLOB)");
  for (const [row, marker] of [[2691, 1], [2692, 2], [2693, 3]] as const) {
    db.prepare("INSERT INTO tiles VALUES (?, ?, ?)").run((13 * 8192 + 4365) * 8192 + row, "topo", png(marker));
  }
  db.close();
  return new Uint8Array(readFileSync(path));
}

const sheetImage = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 7, 8, 9]);
const sheet = zipSync({
  "doc.kml": strToU8(`<kml><GroundOverlay><name>Game map</name><Icon><href>image.png</href></Icon>
    <LatLonQuad><coordinates>11.81,52.37 11.84,52.37 11.84,52.38 11.81,52.38</coordinates></LatLonQuad></GroundOverlay></kml>`),
  "image.png": sheetImage,
});

let app: Express;
let admin: TestUser;
let eventId: string;

interface Snapshot {
  format: number;
  packages: Array<{
    packageId: string;
    revision: number;
    objects: unknown[];
    contents: Array<{ id: string; kind: string; tiles?: number; sha256?: string }>;
    skippedContents: unknown[];
  }>;
  skippedPackages: Array<{ name: string; reason: string }>;
  estimatedBytes: number;
}

async function publishedPackage(name: string, files: Record<string, Uint8Array>): Promise<string> {
  const created = await request(app).post(`/api/v1/events/${eventId}/data-packages`).set("Cookie", admin.cookie).send({ name }).expect(201);
  const id = (created.body as { id: string }).id;
  const url = `/api/v1/events/${eventId}/data-packages/${id}`;
  const layers = await request(app).get(`${url}/layers`).set("Cookie", admin.cookie).expect(200);
  const layerId = (layers.body as { items: Array<{ id: string }> }).items[0]?.id ?? "";
  const zip = zipSync({
    "MANIFEST/manifest.xml": strToU8(manifest(name, ["11111111-1111-4111-8111-111111111111"])),
    "11111111-1111-4111-8111-111111111111/11111111-1111-4111-8111-111111111111.cot": strToU8(spotMarker),
    ...files,
  });
  await request(app)
    .post(`${url}/layers/${layerId}/import/atak`)
    .set("Cookie", admin.cookie)
    .set("Content-Type", "application/zip")
    .send(Buffer.from(zip))
    .expect(200);
  await request(app).post(`${url}/revisions`).set("Cookie", admin.cookie).expect(200);
  return id;
}

function snapshot(user: TestUser, packages: Array<{ packageId: string }>): request.Test {
  return request(app).post(`/api/v1/events/${eventId}/offline-snapshots`).set("Cookie", user.cookie).send({ packages });
}

void describe("offline snapshots", () => {
  beforeEach(async () => {
    await clearDatabase();
    app = createApp();
    admin = await createUser("Admin", PERMISSIONS.map((permission) => ({ permission })));
    eventId = await createEvent();
    await database.event.update({ where: { id: eventId }, data: { status: "active" } });
  });

  after(async () => {
    rmSync(temporary, { recursive: true, force: true });
    await clearDatabase();
    await disconnectDatabase();
  });

  void it("describes published revisions with their displayable map content and audits it", async () => {
    const packageId = await publishedPackage("Maps", { "maps/topo.sqlite": tileCache(), "sheet/game.kmz": sheet });
    const draft = await request(app).post(`/api/v1/events/${eventId}/data-packages`).set("Cookie", admin.cookie).send({ name: "Draft" }).expect(201);

    const response = await snapshot(admin, [{ packageId }, { packageId: (draft.body as { id: string }).id }]).expect(200);
    const body = response.body as Snapshot;
    assert.equal(response.headers["cache-control"], "no-store");
    assert.equal(body.format, 1);
    assert.equal(body.packages.length, 1);
    assert.equal(body.packages[0]?.revision, 1);
    assert.equal(body.packages[0]?.objects.length, 1);
    const kinds = body.packages[0]?.contents.map(({ kind }) => kind).sort();
    assert.deepEqual(kinds, ["image", "tiles"]);
    assert.equal(body.packages[0]?.contents.find(({ kind }) => kind === "tiles")?.tiles, 3);
    assert.equal(
      body.packages[0]?.contents.find(({ kind }) => kind === "image")?.sha256,
      createHash("sha256").update(sheetImage).digest("hex"),
    );
    assert.deepEqual(body.skippedPackages.map(({ name, reason }) => [name, reason]), [["Draft", "not-published"]]);
    assert.ok(body.estimatedBytes > 0);
    assert.equal(await database.auditEvent.count({ where: { action: "event.offline-snapshot-prepared" } }), 1);
  });

  void it("pages through all tiles of a published offline map with checksums", async () => {
    const packageId = await publishedPackage("Maps", { "maps/topo.sqlite": tileCache() });
    const body = (await snapshot(admin, [{ packageId }]).expect(200)).body as Snapshot;
    const contentId = body.packages[0]?.contents[0]?.id ?? "";
    const url = `/api/v1/events/${eventId}/offline-snapshots/packages/${packageId}/revisions/1/contents/${contentId}/tiles`;

    const first = (await request(app).get(`${url}?limit=2`).set("Cookie", admin.cookie).expect(200)).body as {
      items: Array<{ z: number; y: number; data: string; sha256: string }>;
      page: { nextCursor: string | null; hasMore: boolean };
    };
    assert.deepEqual(first.items.map(({ y }) => y), [2691, 2692]);
    assert.equal(first.page.hasMore, true);
    const bytes = Buffer.from(first.items[0]?.data ?? "", "base64");
    assert.deepEqual(bytes, png(1));
    assert.equal(first.items[0]?.sha256, createHash("sha256").update(bytes).digest("hex"));

    const second = (await request(app).get(`${url}?limit=2&cursor=${first.page.nextCursor ?? ""}`).set("Cookie", admin.cookie).expect(200)).body as {
      items: Array<{ y: number }>;
      page: { hasMore: boolean; nextCursor: string | null };
    };
    assert.deepEqual(second.items.map(({ y }) => y), [2693]);
    assert.equal(second.page.hasMore, false);
    assert.equal(second.page.nextCursor, null);

    await request(app).get(`${url}?cursor=not-a-cursor`).set("Cookie", admin.cookie).expect(400);
  });

  void it("serves rubber-sheet images of the published revision only", async () => {
    const packageId = await publishedPackage("Sheet", { "sheet/game.kmz": sheet });
    const body = (await snapshot(admin, [{ packageId }]).expect(200)).body as Snapshot;
    const contentId = body.packages[0]?.contents[0]?.id ?? "";
    const base = `/api/v1/events/${eventId}/offline-snapshots/packages/${packageId}/revisions`;

    const image = await request(app)
      .get(`${base}/1/contents/${contentId}/image`)
      .set("Cookie", admin.cookie)
      .buffer(true)
      .parse((res, callback) => {
        const chunks: Buffer[] = [];
        res.on("data", (chunk: Buffer) => chunks.push(chunk));
        res.on("end", () => callback(null, Buffer.concat(chunks)));
      })
      .expect(200);
    assert.equal(image.headers["content-type"], "image/png");
    assert.equal(image.headers["cache-control"], "no-store");
    assert.deepEqual(new Uint8Array(image.body as Buffer), sheetImage);
    await request(app).get(`${base}/2/contents/${contentId}/image`).set("Cookie", admin.cookie).expect(404);
  });

  void it("requires data package access and an active event", async () => {
    const packageId = await publishedPackage("Maps", { "maps/topo.sqlite": tileCache() });
    const viewer = await createUser("Viewer", [{ permission: "events.read", eventId }]);
    await snapshot(viewer, [{ packageId }]).expect(403);
    await snapshot(admin, [{ packageId }, { packageId }]).expect(422);

    await database.event.update({ where: { id: eventId }, data: { status: "archived" } });
    const response = await snapshot(admin, [{ packageId }]).expect(409);
    assert.equal((response.body as { code: string }).code, "EVENT_NOT_ACTIVE");
  });
});
