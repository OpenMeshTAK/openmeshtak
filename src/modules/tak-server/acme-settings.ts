import type { TakAcmeSettings } from "../../generated/prisma/client.js";
import { decryptSecret, encryptSecret } from "../../shared/crypto/secret-box.js";
import { database } from "../../shared/database/database.js";

export const ACME_SETTINGS_ID = "tak-acme";

const DEFAULTS = {
  enabled: false,
  email: null,
  challengeType: "dns-01",
  provider: "cloudflare",
  cloudflareZoneId: null,
  apiTokenEnvelope: null,
  accountKeyEnvelope: null,
  lastAttemptAt: null,
  lastSuccessAt: null,
  lastError: null,
};

export async function loadTakAcmeSettings(): Promise<TakAcmeSettings> {
  const row = await database.takAcmeSettings.findUnique({ where: { id: ACME_SETTINGS_ID } });
  return row ?? { id: ACME_SETTINGS_ID, ...DEFAULTS, version: 0, updatedAt: new Date(0) };
}

export function encryptAcmeApiToken(token: string): string {
  return encryptSecret(Buffer.from(token, "utf8"), "tak-acme-api-token", ACME_SETTINGS_ID);
}

export function decryptAcmeApiToken(envelope: string): string {
  return decryptSecret(envelope, "tak-acme-api-token", ACME_SETTINGS_ID).toString("utf8");
}

export function encryptAcmeAccountKey(key: Buffer): string {
  return encryptSecret(key, "tak-acme-account-key", ACME_SETTINGS_ID);
}

export function decryptAcmeAccountKey(envelope: string): Buffer {
  return decryptSecret(envelope, "tak-acme-account-key", ACME_SETTINGS_ID);
}
