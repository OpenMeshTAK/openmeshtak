import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { after, beforeEach, describe, it } from "node:test";
import type { Express } from "express";
import request from "supertest";
import { createApp } from "../src/app.js";
import { PERMISSIONS } from "../src/shared/auth/permissions.js";
import { database, disconnectDatabase } from "../src/shared/database/database.js";
import { clearDatabase, createApiClientKey, createUser, type TestUser } from "./support/identity.js";

interface ProblemBody {
  code?: string;
  errors?: Array<{ field: string }>;
}

interface EventBody {
  id: string;
  slug: string;
}

interface OpenApiOperation {
  operationId?: string;
  parameters?: Array<{ in: string; name: string; required?: boolean }>;
}

let app: Express;
let admin: TestUser;

after(async () => {
  await clearDatabase();
  await disconnectDatabase();
});

function createEvent(slug: string, key?: string): request.Test {
  const call = request(app)
    .post("/api/v1/events")
    .set("Cookie", admin.cookie)
    .send({ name: `Event ${slug}`, slug, timeZone: "Europe/Berlin" });
  return key === undefined ? call : call.set("Idempotency-Key", key);
}

void describe("Idempotency-Key", () => {
  beforeEach(async () => {
    await clearDatabase();
    app = createApp();
    admin = await createUser("Admin", PERMISSIONS.map((permission) => ({ permission })));
  });

  void it("returns the original response to a retry instead of creating twice", async () => {
    const first = await createEvent("alpha", "retry-1").expect(201);
    assert.equal(first.headers["idempotent-replayed"], undefined);

    const retry = await createEvent("alpha", "retry-1").expect(201);
    assert.equal(retry.headers["idempotent-replayed"], "true");
    assert.match(retry.headers["content-type"] ?? "", /^application\/json/);
    assert.deepEqual(retry.body, first.body);
    assert.equal(await database.event.count(), 1);
  });

  void it("treats a different body with the same key as a conflict", async () => {
    await createEvent("alpha", "retry-2").expect(201);

    const reused = await createEvent("bravo", "retry-2").expect(409);
    assert.equal((reused.body as ProblemBody).code, "IDEMPOTENCY_KEY_REUSED");
    assert.equal(await database.event.count(), 1);
  });

  void it("replays a stored problem response with its status", async () => {
    await createEvent("alpha").expect(201);

    const conflict = await createEvent("alpha", "retry-3").expect(409);
    assert.equal((conflict.body as ProblemBody).code, "SLUG_CONFLICT");

    const retry = await createEvent("alpha", "retry-3").expect(409);
    assert.equal(retry.headers["idempotent-replayed"], "true");
    assert.match(retry.headers["content-type"] ?? "", /^application\/problem\+json/);
    assert.equal((retry.body as ProblemBody).code, "SLUG_CONFLICT");
  });

  void it("scopes keys to the caller", async () => {
    const apiKey = await createApiClientKey([{ permission: "events.manage" }]);
    const fromUser = (await createEvent("alpha", "shared-key").expect(201)).body as EventBody;

    const fromClient = await request(app)
      .post("/api/v1/events")
      .set("Authorization", `Bearer ${apiKey}`)
      .set("Idempotency-Key", "shared-key")
      .send({ name: "Event bravo", slug: "bravo", timeZone: "Europe/Berlin" })
      .expect(201);
    assert.notEqual((fromClient.body as EventBody).id, fromUser.id);
    assert.equal(fromClient.headers["idempotent-replayed"], undefined);
  });

  void it("asks the client to wait while the first request is still running", async () => {
    await createEvent("alpha", "busy").expect(201);
    await database.idempotencyRecord.updateMany({ data: { responseStatus: null, responseBody: null } });

    const busy = await createEvent("alpha", "busy").expect(409);
    assert.equal((busy.body as ProblemBody).code, "IDEMPOTENCY_REQUEST_IN_PROGRESS");
    assert.equal(busy.headers["retry-after"], "1");
  });

  void it("forgets results after they expire", async () => {
    await createEvent("alpha", "old").expect(201);
    await database.idempotencyRecord.updateMany({ data: { expiresAt: new Date(Date.now() - 1000) } });

    const fresh = await createEvent("bravo", "old").expect(201);
    assert.equal(fresh.headers["idempotent-replayed"], undefined);
    assert.equal(await database.event.count(), 2);
  });

  void it("rejects malformed keys", async () => {
    const invalid = await createEvent("alpha", "x".repeat(256)).expect(422);
    assert.deepEqual((invalid.body as ProblemBody).errors?.map(({ field }) => field), ["header.Idempotency-Key"]);
    assert.equal(await database.event.count(), 0);
  });

  void it("does not store requests without a key", async () => {
    await createEvent("alpha").expect(201);
    await createEvent("alpha").expect(409);
    assert.equal(await database.idempotencyRecord.count(), 0);
  });

  void it("works on POST routes without a body", async () => {
    const eventId = randomUUID();
    await database.event.create({
      data: { id: eventId, name: "Event", slug: "event", timeZone: "Europe/Berlin" },
    });
    const publish = (): request.Test =>
      request(app)
        .post(`/api/v1/events/${eventId}/configuration-revisions`)
        .set("Cookie", admin.cookie)
        .set("Idempotency-Key", "publish-1");

    // A draft event cannot be published yet; the refusal is stored like any other answer.
    await publish().expect(409);
    const retry = await publish().expect(409);
    assert.equal(retry.headers["idempotent-replayed"], "true");
  });

  void it("documents the header on every duplicate-sensitive POST", () => {
    const document = JSON.parse(readFileSync("openapi/openapi.json", "utf8")) as {
      paths: Record<string, Record<string, OpenApiOperation>>;
    };
    const documented = Object.values(document.paths)
      .flatMap((operations) => Object.values(operations))
      .filter((operation) =>
        operation.parameters?.some(
          (parameter) => parameter.in === "header" && parameter.name === "Idempotency-Key" && !parameter.required,
        ),
      )
      .map((operation) => operation.operationId)
      .sort();

    assert.deepEqual(documented, [
      "CreateDataPackage",
      "CreateDataPackageCopy",
      "CreateEvent",
      "CreateEventGroup",
      "CreateEventMember",
      "CreateEventRole",
      "CreatePackageLayer",
      "CreatePackageObject",
      "CreateTakGroup",
      "PublishConfiguration",
      "PublishDataPackage",
    ]);
  });
});
