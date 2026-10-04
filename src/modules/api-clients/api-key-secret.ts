import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

const API_KEY_PREFIX = "omtk_ak_";

/**
 * The public key ID is hex so it can never contain the `_` separator; the secret is base64url
 * of 32 random bytes and may contain `_`, so parsing splits only at the first separator.
 */
const apiKeyPattern = /^omtk_ak_([0-9a-f]{24})_([A-Za-z0-9_-]{43})$/;

export interface GeneratedApiKey {
  publicKeyId: string;
  secretHash: string;
  plaintext: string;
}

export interface ParsedApiKey {
  publicKeyId: string;
  secret: string;
}

/**
 * SHA-256 is appropriate here because the secret is uniformly random and high entropy.
 * Human passwords must never use this fast digest.
 */
export function hashApiKeySecret(secret: string): string {
  return createHash("sha256").update(secret, "utf8").digest("hex");
}

export function generateApiKey(): GeneratedApiKey {
  const publicKeyId = randomBytes(12).toString("hex");
  const secret = randomBytes(32).toString("base64url");

  return {
    publicKeyId,
    secretHash: hashApiKeySecret(secret),
    plaintext: `${API_KEY_PREFIX}${publicKeyId}_${secret}`,
  };
}

export function parseApiKey(value: string): ParsedApiKey | null {
  const match = apiKeyPattern.exec(value);
  if (match === null) {
    return null;
  }

  const [, publicKeyId, secret] = match;
  return publicKeyId === undefined || secret === undefined ? null : { publicKeyId, secret };
}

export function apiKeySecretMatches(secret: string, expectedHash: string): boolean {
  const actual = Buffer.from(hashApiKeySecret(secret), "hex");
  const expected = Buffer.from(expectedHash, "hex");

  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

/** Non-secret label that helps humans recognize a key without revealing any secret character. */
export function apiKeyDisplayPrefix(publicKeyId: string): string {
  return `${API_KEY_PREFIX}${publicKeyId}`;
}
