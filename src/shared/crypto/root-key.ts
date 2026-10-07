import { randomBytes } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { config } from "../config/config.js";

const ROOT_KEY_BYTES = 32;
const DEVELOPMENT_KEY_FILE = resolve("server/secrets/root-encryption.key");

function decodeRootKey(contents: string, source: string): Buffer {
  const key = Buffer.from(contents.trim(), "base64");
  if (key.length !== ROOT_KEY_BYTES) {
    throw new Error(
      `The root encryption key in ${source} must be ${String(ROOT_KEY_BYTES)} bytes encoded as base64.`,
    );
  }
  return key;
}

/**
 * Development keeps its key beside (never inside) the data directory so stored secrets survive
 * restarts. Losing this file makes those secrets unreadable on purpose: decryption fails closed.
 */
function loadOrCreateDevelopmentKey(): Buffer {
  if (!existsSync(DEVELOPMENT_KEY_FILE)) {
    mkdirSync(dirname(DEVELOPMENT_KEY_FILE), { recursive: true });
    writeFileSync(DEVELOPMENT_KEY_FILE, `${randomBytes(ROOT_KEY_BYTES).toString("base64")}\n`, {
      flag: "wx",
      mode: 0o600,
    });
  }
  return decodeRootKey(readFileSync(DEVELOPMENT_KEY_FILE, "utf8"), DEVELOPMENT_KEY_FILE);
}

export interface RootKeySource {
  key: string | undefined;
  file: string | undefined;
  nodeEnvironment: "development" | "test" | "production";
}

/**
 * The key comes from `ROOT_ENCRYPTION_KEY` or from the file in `ROOT_ENCRYPTION_KEY_FILE`. The
 * image always sets the file path, so only an existing file next to a set key is a conflict: two
 * different keys would make it unclear which one encrypted the stored secrets.
 */
export function resolveRootKey(source: RootKeySource): Buffer {
  if (source.key !== undefined) {
    if (source.file !== undefined && existsSync(source.file)) {
      throw new Error("Set either ROOT_ENCRYPTION_KEY or the ROOT_ENCRYPTION_KEY_FILE secret, not both.");
    }
    return decodeRootKey(source.key, "ROOT_ENCRYPTION_KEY");
  }
  if (source.file !== undefined) {
    return decodeRootKey(readFileSync(source.file, "utf8"), "ROOT_ENCRYPTION_KEY_FILE");
  }
  // Tests run against throwaway databases, so a key that lives only in this process is enough.
  return source.nodeEnvironment === "test"
    ? randomBytes(ROOT_KEY_BYTES)
    : loadOrCreateDevelopmentKey();
}

function loadRootKey(): Buffer {
  return resolveRootKey({
    key: config.rootEncryptionKey,
    file: config.rootEncryptionKeyFile,
    nodeEnvironment: config.nodeEnvironment,
  });
}

let rootKey: Buffer | undefined;

/** The deployment root key. Read once; never logged, stored in the database or returned. */
export function getRootKey(): Buffer {
  rootKey ??= loadRootKey();
  return rootKey;
}
