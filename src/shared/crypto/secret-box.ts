import { createCipheriv, createDecipheriv, createHash, hkdfSync, randomBytes } from "node:crypto";
import { getRootKey } from "./root-key.js";

/**
 * Application-level encryption for secrets stored in the database, such as Meshtastic PSKs.
 *
 * Envelope: `v1.<keyId>.<iv>.<ciphertext>.<tag>` with base64url parts. AES-256-GCM uses a key
 * derived per purpose from the root key through HKDF-SHA256, so a value encrypted for one purpose
 * cannot be decrypted as another. The record context (for example the owning row ID) is bound as
 * additional authenticated data, so a ciphertext copied into another row fails to decrypt. The
 * key ID fingerprints the root key so a later rotation can tell old and new values apart.
 */

export type SecretPurpose = "meshtastic-channel-psk";

const ENVELOPE_VERSION = "v1";
const IV_BYTES = 12;

export class SecretDecryptionError extends Error {
  constructor(reason: string) {
    super(`Stored secret cannot be decrypted: ${reason}.`);
    this.name = "SecretDecryptionError";
  }
}

function rootKeyId(): string {
  return createHash("sha256")
    .update("openmeshtak:root-key-id")
    .update(getRootKey())
    .digest("base64url")
    .slice(0, 8);
}

function purposeKey(purpose: SecretPurpose): Buffer {
  return Buffer.from(
    hkdfSync("sha256", getRootKey(), Buffer.alloc(0), `openmeshtak:${purpose}:v1`, 32),
  );
}

function additionalData(purpose: SecretPurpose, context: string): Buffer {
  return Buffer.from(`${purpose}\u0000${context}`, "utf8");
}

export function encryptSecret(plaintext: Buffer, purpose: SecretPurpose, context: string): string {
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv("aes-256-gcm", purposeKey(purpose), iv);
  cipher.setAAD(additionalData(purpose, context));
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);

  return [
    ENVELOPE_VERSION,
    rootKeyId(),
    iv.toString("base64url"),
    ciphertext.toString("base64url"),
    cipher.getAuthTag().toString("base64url"),
  ].join(".");
}

/** Fails closed: a wrong key, wrong context or tampered value throws instead of returning data. */
export function decryptSecret(envelope: string, purpose: SecretPurpose, context: string): Buffer {
  const [version, keyId, iv, ciphertext, tag, ...rest] = envelope.split(".");
  if (
    version !== ENVELOPE_VERSION ||
    keyId === undefined ||
    iv === undefined ||
    ciphertext === undefined ||
    tag === undefined ||
    rest.length > 0
  ) {
    throw new SecretDecryptionError("unknown envelope format");
  }
  if (keyId !== rootKeyId()) {
    throw new SecretDecryptionError("it was encrypted with a different root key");
  }

  try {
    const decipher = createDecipheriv(
      "aes-256-gcm",
      purposeKey(purpose),
      Buffer.from(iv, "base64url"),
    );
    decipher.setAAD(additionalData(purpose, context));
    decipher.setAuthTag(Buffer.from(tag, "base64url"));
    return Buffer.concat([decipher.update(Buffer.from(ciphertext, "base64url")), decipher.final()]);
  } catch {
    throw new SecretDecryptionError("authentication failed");
  }
}
