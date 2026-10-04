import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, describe, it } from "node:test";
import express from "express";
import request from "supertest";
import { notFoundHandler } from "../src/shared/errors/problem.js";
import { mountWebApp } from "../src/shared/http/web-app.js";

const webRoot = mkdtempSync(join(tmpdir(), "openmeshtak-web-"));
mkdirSync(join(webRoot, "assets"));
writeFileSync(join(webRoot, "index.html"), "<!doctype html><title>OpenMeshTak</title>");
writeFileSync(join(webRoot, "assets", "index-abc123.js"), "console.log('app');");
writeFileSync(join(webRoot, "sw.js"), "self.skipWaiting();");

function createWebApp(): express.Express {
  const app = express();
  app.get("/api/v1/health", (_request, response) => {
    response.json({ status: "ok" });
  });
  mountWebApp(app, webRoot);
  app.use(notFoundHandler);
  return app;
}

void describe("Web app served by Core", () => {
  after(() => {
    rmSync(webRoot, { recursive: true, force: true });
  });

  void it("serves the app shell for the root and client-side routes, always revalidated", async () => {
    for (const path of ["/", "/events/123/members"]) {
      const response = await request(createWebApp()).get(path).expect(200);
      assert.match(response.text, /<title>OpenMeshTak<\/title>/);
      assert.equal(response.headers["cache-control"], "no-cache");
    }
  });

  void it("caches hashed assets forever and revalidates the service worker", async () => {
    const asset = await request(createWebApp()).get("/assets/index-abc123.js").expect(200);
    assert.equal(asset.headers["cache-control"], "public, max-age=31536000, immutable");
    const worker = await request(createWebApp()).get("/sw.js").expect(200);
    assert.equal(worker.headers["cache-control"], "no-cache");
  });

  void it("keeps API routes and JSON 404s for unknown API paths and missing files", async () => {
    await request(createWebApp()).get("/api/v1/health").expect(200, { status: "ok" });
    for (const path of ["/api/v1/unknown", "/api", "/assets/missing.js"]) {
      const response = await request(createWebApp()).get(path).expect(404);
      assert.match(response.headers["content-type"] ?? "", /^application\/problem\+json/);
    }
    await request(createWebApp()).post("/events").expect(404);
  });
});
