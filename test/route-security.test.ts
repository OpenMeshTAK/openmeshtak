import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { after, describe, it } from "node:test";
import request from "supertest";
import { createApp } from "../src/app.js";
import { disconnectDatabase } from "../src/shared/database/database.js";

interface Operation {
  security?: Array<Record<string, unknown>>;
}

interface OpenApiDocument {
  paths: Record<string, Record<string, Operation>>;
}

/** Every intentionally public operation. Adding one here must be a deliberate security decision. */
const PUBLIC_OPERATIONS = new Set([
  "GET /health",
  "GET /setup",
  "POST /setup",
  "POST /auth/claims/exchange",
  "POST /auth/setup-links/exchange",
  // Registration mode, and sign-up itself while an administrator allows it.
  "GET /registration",
  "POST /registration",
  // The short-lived, hashed link token is the credential (download grants).
  "GET /downloads/{token}",
]);

const document = JSON.parse(readFileSync("openapi/openapi.json", "utf8")) as OpenApiDocument;
const operations = Object.entries(document.paths).flatMap(([path, methods]) =>
  Object.entries(methods).map(([method, operation]) => ({ method, path, operation })),
);

function concretePath(path: string): string {
  return `/api/v1${path}`
    .replace("{provider}", "discord")
    .replace("{externalId}", "123456789")
    .replace(/\{[^}]+\}/g, "00000000-0000-4000-8000-000000000000");
}

void describe("route security", () => {
  after(async () => {
    await disconnectDatabase();
  });

  void it("declares security on every operation except the reviewed public ones", () => {
    const unexpectedPublic = operations
      .filter(({ operation }) => (operation.security ?? []).length === 0)
      .map(({ method, path }) => `${method.toUpperCase()} ${path}`)
      .filter((operation) => !PUBLIC_OPERATIONS.has(operation));

    assert.deepEqual(unexpectedPublic, []);
  });

  void it("rejects unauthenticated calls to every protected operation the spec describes", async () => {
    const app = createApp();
    const failures: string[] = [];

    for (const { method, path, operation } of operations) {
      if ((operation.security ?? []).length === 0) {
        continue;
      }
      const response = await request(app)[method as "get" | "post" | "put" | "delete"](concretePath(path)).send({});
      // 404 would mean the documented route is not mounted; anything but 401 is a leak.
      if (response.status !== 401) {
        failures.push(`${method.toUpperCase()} ${path} -> ${String(response.status)}`);
      }
    }

    assert.deepEqual(failures, []);
    assert.ok(operations.length > 40, "the OpenAPI document lists the full API surface");
  });
});
