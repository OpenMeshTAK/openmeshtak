import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  SecretDecryptionError,
  decryptSecret,
  encryptSecret,
} from "../src/shared/crypto/secret-box.js";

const PURPOSE = "meshtastic-channel-psk";

void describe("secret box", () => {
  void it("round-trips a secret without exposing it in the envelope", () => {
    const secret = Buffer.from("0123456789abcdef0123456789abcdef");
    const envelope = encryptSecret(secret, PURPOSE, "channel-1");

    assert.match(envelope, /^v1\.[\w-]{8}\.[\w-]+\.[\w-]+\.[\w-]+$/);
    assert.equal(envelope.includes(secret.toString("base64url")), false);
    assert.deepEqual(decryptSecret(envelope, PURPOSE, "channel-1"), secret);
  });

  void it("uses a fresh IV for every encryption", () => {
    const secret = Buffer.from("same secret");
    assert.notEqual(encryptSecret(secret, PURPOSE, "a"), encryptSecret(secret, PURPOSE, "a"));
  });

  void it("fails closed for another record context", () => {
    const envelope = encryptSecret(Buffer.from("secret"), PURPOSE, "channel-1");
    assert.throws(() => decryptSecret(envelope, PURPOSE, "channel-2"), SecretDecryptionError);
  });

  void it("fails closed for tampered, foreign-key or unknown envelopes", () => {
    const parts = encryptSecret(Buffer.from("secret"), PURPOSE, "channel-1").split(".");
    const tampered = [...parts];
    tampered[3] = Buffer.from("other").toString("base64url");
    const foreignKey = [...parts];
    foreignKey[1] = "otherkey";

    assert.throws(() => decryptSecret(tampered.join("."), PURPOSE, "channel-1"), SecretDecryptionError);
    assert.throws(() => decryptSecret(foreignKey.join("."), PURPOSE, "channel-1"), SecretDecryptionError);
    assert.throws(() => decryptSecret("v0.x.y.z.w", PURPOSE, "channel-1"), SecretDecryptionError);
  });
});
