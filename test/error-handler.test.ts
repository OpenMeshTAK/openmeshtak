import assert from "node:assert/strict";
import { describe, it } from "node:test";
import express from "express";
import request from "supertest";
import { errorHandler } from "../src/shared/errors/problem.js";
import { notFoundProblem } from "../src/shared/errors/problem-error.js";
import { requestLogging } from "../src/shared/logging/request-logging.js";

function failingApp(failure: Error): express.Express {
  const app = express();
  app.use(requestLogging);
  app.get("/failure", async () => {
    await Promise.resolve();
    throw failure;
  });
  app.use(errorHandler);
  return app;
}

void describe("async HTTP error handling", () => {
  void it("forwards rejected handlers to the domain problem boundary", async () => {
    const response = await request(failingApp(notFoundProblem())).get("/failure").timeout(2000).expect(404);
    const body = response.body as { code: string; traceId: string };
    assert.equal(body.code, "NOT_FOUND");
    assert.ok(body.traceId);
    assert.equal(body.traceId, response.headers["x-trace-id"]);
    assert.match(String(response.headers["content-type"]), /^application\/problem\+json/);
  });

  void it("returns a safe problem response for an unexpected rejected handler", async () => {
    const response = await request(failingApp(new Error("private implementation details"))).get("/failure").timeout(2000).expect(500);
    const body = response.body as { code: string; traceId: string };
    assert.equal(body.code, "INTERNAL_ERROR");
    assert.ok(body.traceId);
    assert.equal(body.traceId, response.headers["x-trace-id"]);
    assert.doesNotMatch(response.text, /private implementation details|stack/);
  });
});
