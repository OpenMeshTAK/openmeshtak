import { decryptSecret, encryptSecret } from "../../shared/crypto/secret-box.js";
import type { SecretSettings } from "./firmware-settings.js";

/**
 * Secret field values travel as one encrypted JSON envelope per event. The event ID is bound into
 * the ciphertext so an envelope cannot be copied to another event's configuration.
 */
export function encryptSecretSettings(eventId: string, secrets: SecretSettings): string | null {
  if (Object.keys(secrets).length === 0) {
    return null;
  }
  return encryptSecret(Buffer.from(JSON.stringify(secrets), "utf8"), "meshtastic-secret-settings", eventId);
}

export function decryptSecretSettings(eventId: string, envelope: string | null): SecretSettings {
  if (envelope === null) {
    return {};
  }
  return JSON.parse(decryptSecret(envelope, "meshtastic-secret-settings", eventId).toString("utf8")) as SecretSettings;
}
