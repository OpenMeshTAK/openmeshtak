import assert from "node:assert/strict";
import { describe, it } from "node:test";
import request from "supertest";
import { createApp } from "../src/app.js";

void describe("GET /api/v1/health", () => {
  void it("returns a small public health response", async () => {
    const response = await request(createApp()).get("/api/v1/health").expect(200);
    const body = response.body as {
      service: unknown;
      status: unknown;
      timestamp: unknown;
    };

    assert.match(response.headers["content-type"] ?? "", /^application\/json/);
    assert.equal(typeof response.headers["x-trace-id"], "string");
    assert.equal(body.status, "ok");
    assert.equal(body.service, "openmeshtak");
    assert.equal(typeof body.timestamp, "string");
    assert.match(body.timestamp as string, /^\d{4}-\d{2}-\d{2}T/);
  });

  void it("is represented in the generated OpenAPI contract", async () => {
    const response = await request(createApp()).get("/api/openapi.json").expect(200);
    const body = response.body as {
      components?: {
        securitySchemes?: Record<string, unknown>;
      };
      openapi?: unknown;
      paths?: {
        "/health"?: {
          get?: { security?: unknown[] };
        };
        "/setup"?: {
          post?: { security?: unknown[] };
        };
      };
    };

    assert.equal(body.openapi, "3.0.0");
    assert.ok(body.paths?.["/health"]);
    assert.deepEqual(body.paths?.["/health"]?.get?.security, []);
    assert.deepEqual(body.paths?.["/setup"]?.post?.security, []);
    assert.ok(body.components?.securitySchemes?.sessionCookie);
  });

  void it("returns RFC 9457-style details for unknown routes", async () => {
    const response = await request(createApp()).get("/api/v1/missing").expect(404);
    const body = response.body as {
      code?: unknown;
      status?: unknown;
      traceId?: unknown;
      type?: unknown;
    };

    assert.match(response.headers["content-type"] ?? "", /^application\/problem\+json/);
    assert.equal(body.type, "urn:openmeshtak:problem:not-found");
    assert.equal(body.code, "NOT_FOUND");
    assert.equal(body.status, 404);
    assert.equal(body.traceId, response.headers["x-trace-id"]);
  });
});
