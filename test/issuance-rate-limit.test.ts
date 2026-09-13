import assert from "node:assert/strict";
import { describe, it } from "node:test";
import express from "express";
import request from "supertest";
import { issuanceRateLimit } from "../src/shared/http/issuance-rate-limit.js";

void describe("credential issuance rate limit", () => {
  void it("answers with a problem once a client exceeds the limit", async () => {
    const app = express();
    app.post("/keys", issuanceRateLimit(2, "API keys"), (_request, response) => {
      response.status(201).end();
    });

    await request(app).post("/keys").expect(201);
    await request(app).post("/keys").expect(201);
    const limited = await request(app).post("/keys").expect(429);

    assert.equal((limited.body as { code: string }).code, "RATE_LIMITED");
    assert.match(String(limited.headers["content-type"]), /application\/problem\+json/);
  });
});
