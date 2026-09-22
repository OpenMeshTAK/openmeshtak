import { randomUUID } from "node:crypto";
import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { resolve, sep } from "node:path";
import { config } from "../config/config.js";

const storageRoot = resolve(config.dataDirectory, "storage");

/** Absolute path of a stored blob, for readers such as SQLite that need a file. Never served. */
export function storagePath(storageKey: string): string {
  const path = resolve(storageRoot, storageKey);
  if (path !== storageRoot && !path.startsWith(`${storageRoot}${sep}`)) {
    throw new Error("Stored blob key escaped the storage directory.");
  }
  return path;
}

/** Writes validated bytes under a generated key using an atomic rename in the destination folder. */
export async function writeBlob(bytes: Uint8Array): Promise<string> {
  const id = randomUUID();
  const directoryKey = `uploads/${id.slice(0, 2)}`;
  const storageKey = `${directoryKey}/${id}`;
  const directory = storagePath(directoryKey);
  const destination = storagePath(storageKey);
  const temporary = `${destination}.${randomUUID()}.tmp`;
  await mkdir(directory, { recursive: true, mode: 0o700 });
  try {
    await writeFile(temporary, bytes, { flag: "wx", mode: 0o600 });
    await rename(temporary, destination);
    return storageKey;
  } catch (error: unknown) {
    await rm(temporary, { force: true });
    throw error;
  }
}

export async function readBlob(storageKey: string): Promise<Uint8Array> {
  return new Uint8Array(await readFile(storagePath(storageKey)));
}

export async function removeBlob(storageKey: string): Promise<void> {
  await rm(storagePath(storageKey), { force: true });
}
