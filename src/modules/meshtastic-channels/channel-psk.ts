import { randomBytes } from "node:crypto";
import type { MeshtasticChannel } from "../../generated/prisma/client.js";
import { decryptSecret, encryptSecret } from "../../shared/crypto/secret-box.js";
import { validationProblem } from "../../shared/errors/problem-error.js";

/**
 * How a channel encrypts traffic, derived from the PSK length as defined by upstream
 * `channel.proto`: no key disables encryption, one byte selects a well-known default key, and 16
 * or 32 bytes are AES-128 or AES-256 keys.
 */
export type ChannelPskKind = "none" | "default" | "aes128" | "aes256";

const KIND_BY_LENGTH: ReadonlyMap<number, ChannelPskKind> = new Map([
  [0, "none"],
  [1, "default"],
  [16, "aes128"],
  [32, "aes256"],
]);

const GENERATED_PSK_BYTES = 32;
const BASE64_PATTERN = /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/;

export function pskKind(bytes: number): ChannelPskKind {
  return KIND_BY_LENGTH.get(bytes) ?? "none";
}

/** Without an explicit key, channels get a fresh random AES-256 key. */
export function parseOrGeneratePsk(value: string | undefined): Buffer {
  if (value === undefined) {
    return randomBytes(GENERATED_PSK_BYTES);
  }

  const psk = BASE64_PATTERN.test(value) ? Buffer.from(value, "base64") : null;
  if (psk === null || !KIND_BY_LENGTH.has(psk.length)) {
    throw validationProblem([
      {
        field: "psk",
        code: "INVALID_PSK",
        message: "Use base64 for an empty, 1-byte, 16-byte or 32-byte key.",
      },
    ]);
  }
  return psk;
}

/** The channel ID is bound into the ciphertext so an envelope cannot be moved to another row. */
export function encryptChannelPsk(channelId: string, psk: Buffer): string {
  return encryptSecret(psk, "meshtastic-channel-psk", channelId);
}

export function decryptChannelPsk(channel: Pick<MeshtasticChannel, "id" | "pskEnvelope">): Buffer {
  return decryptSecret(channel.pskEnvelope, "meshtastic-channel-psk", channel.id);
}
