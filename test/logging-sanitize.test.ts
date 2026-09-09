import assert from "node:assert/strict";
import { describe, it } from "node:test";
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
});
