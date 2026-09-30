import assert from "node:assert/strict";
import { describe, it } from "node:test";
import request from "supertest";
import { createApp } from "../src/app.js";

void describe("API documentation", () => {
  void it("serves Swagger UI in development and the OpenAPI document always", async () => {
    const app = createApp();
    const docs = await request(app).get("/api/docs/").expect(200);
    assert.match(docs.text, /swagger-ui/i);
    const spec = (await request(app).get("/api/openapi.json").expect(200)).body as { info: { title: string } };
    assert.equal(spec.info.title, "OpenMeshTak Core API");
  });
});
