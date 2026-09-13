import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { Writable } from "node:stream";
import { createLogger } from "../src/shared/logging/logger.js";
import {
  sanitizeLogMetadata,
  sanitizeLogMetadataOrFallback,
} from "../src/shared/logging/sanitize.js";

void describe("log metadata sanitization", () => {
  void it("redacts nested secret fields and recognizable secret values", () => {
    const sanitized = sanitizeLogMetadata({
      headers: {
        Authorization: "Bearer omtk_sa_public_secret",
        cookie: "session=secret",
      },
      nested: [
        { pSk: "radio-secret" },
        { note: "leaked omtk_sa_key_randomSecret in text" },
        { note: "leaked omtk_bootstrap_randomSecret in text" },
      ],
      privateMaterial:
        "-----BEGIN PRIVATE KEY-----\nsecret\n-----END PRIVATE KEY-----",
    });

    assert.deepEqual(sanitized, {
      headers: {
        Authorization: "[REDACTED]",
        cookie: "[REDACTED]",
      },
      nested: [
        { pSk: "[REDACTED]" },
        { note: "leaked [REDACTED] in text" },
        { note: "leaked [REDACTED] in text" },
      ],
      privateMaterial: "[REDACTED]",
    });
  });

  void it("emits only a static fallback when sanitization fails", () => {
    const sanitized = sanitizeLogMetadataOrFallback({ unsafe: "value" }, () => {
      throw new Error("sanitizer failed with secret");
    });

    assert.deepEqual(sanitized, { event: "log_sanitization_failed" });
  });

  void it("redacts secrets in the written log line, including the message", () => {
    const lines: string[] = [];
    const destination = new Writable({
      write(chunk: Buffer, _encoding, callback) {
        lines.push(chunk.toString("utf8"));
        callback();
      },
    });
    const log = createLogger(destination, "info");

    log.error(
      {
        event: "test",
        request: { headers: { "x-api-key": "plain" }, body: { password: "hunter2hunter2" } },
        details: [new Error("bad key omtk_sa_abc_secretPart")],
      },
      "Rejected omtk_claim_SecretClaimToken",
    );

    const written = lines.join("");
    for (const secret of ["plain", "hunter2hunter2", "secretPart", "SecretClaimToken"]) {
      assert.equal(written.includes(secret), false, `${secret} leaked into the log`);
    }
    assert.match(written, /Rejected \[REDACTED\]/);
  });
});
