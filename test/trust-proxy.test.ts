import assert from "node:assert/strict";
import { describe, it } from "node:test";
import express from "express";
import request from "supertest";
import { trustProxySetting } from "../src/shared/http/trust-proxy.js";

function appWith(trustProxy: boolean): express.Express {
  const app = express();
  app.set("trust proxy", trustProxySetting(trustProxy));
  app.get("/ip", (req, res) => {
    res.json({ ip: req.ip });
  });
  return app;
}

void describe("trust proxy", () => {
  void it("uses the address the reverse proxy added, not one the client sent", async () => {
    const response = await request(appWith(true))
      .get("/ip")
      .set("X-Forwarded-For", "198.51.100.1, 203.0.113.7")
      .expect(200);

    assert.equal((response.body as { ip: string }).ip, "203.0.113.7");
  });

  void it("ignores X-Forwarded-For when disabled", async () => {
    const response = await request(appWith(false))
      .get("/ip")
      .set("X-Forwarded-For", "203.0.113.7")
      .expect(200);

    assert.notEqual((response.body as { ip: string }).ip, "203.0.113.7");
  });
});
