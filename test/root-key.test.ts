import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, describe, it } from "node:test";
import { resolveRootKey } from "../src/shared/crypto/root-key.js";

const directory = mkdtempSync(join(tmpdir(), "openmeshtak-root-key-"));
after(() => rmSync(directory, { recursive: true, force: true }));

const keyBytes = randomBytes(32);
const keyText = keyBytes.toString("base64");
const keyFile = join(directory, "root_encryption_key");
writeFileSync(keyFile, `${keyText}\n`);
const missingFile = join(directory, "not-mounted");

void describe("root key source", () => {
  void it("reads the key from ROOT_ENCRYPTION_KEY", () => {
    const key = resolveRootKey({ key: keyText, file: undefined, nodeEnvironment: "production" });
    assert.deepEqual(key, keyBytes);
  });

  void it("reads the key from the secret file", () => {
    const key = resolveRootKey({ key: undefined, file: keyFile, nodeEnvironment: "production" });
    assert.deepEqual(key, keyBytes);
  });

  void it("uses the environment key when the image's default secret path is not mounted", () => {
    const key = resolveRootKey({ key: keyText, file: missingFile, nodeEnvironment: "production" });
    assert.deepEqual(key, keyBytes);
  });

  void it("refuses a key in both places", () => {
    assert.throws(
      () => resolveRootKey({ key: keyText, file: keyFile, nodeEnvironment: "production" }),
      /either ROOT_ENCRYPTION_KEY or the ROOT_ENCRYPTION_KEY_FILE secret/u,
    );
  });

  void it("rejects a key of the wrong length without echoing it", () => {
    const short = randomBytes(16).toString("base64");
    assert.throws(
      () => resolveRootKey({ key: short, file: undefined, nodeEnvironment: "production" }),
      (error: unknown) => error instanceof Error && error.message.includes("ROOT_ENCRYPTION_KEY") && !error.message.includes(short),
    );
  });
});
