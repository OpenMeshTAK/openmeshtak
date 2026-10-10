import { createHash } from "node:crypto";
import type { Request } from "express";
import busboy from "busboy";

/** Largest file a TAK app may upload into a mission, like an imported Data Package. */
export const MAX_MISSION_FILE_BYTES = 64 * 1024 * 1024;
/** Uploads waiting to be added to a mission, across all users; they are kept in memory only. */
const MAX_PENDING_BYTES = 256 * 1024 * 1024;
const MAX_PENDING_PER_USER = 10;
const PENDING_LIFETIME_MS = 30 * 60 * 1000;
const MAX_FILE_NAME_LENGTH = 200;

export interface UploadedFile {
  sha256: string;
  fileName: string;
  bytes: Uint8Array;
  uploadedAt: Date;
}

interface PendingUpload extends UploadedFile {
  userId: string;
  expiresAt: number;
}

/**
 * TAK apps upload a file first (`/Marti/sync/missionupload` or `/Marti/sync/upload`) and add it to
 * a mission by hash afterwards (`PUT …/contents` with `hashes`). Until then the file waits here,
 * bound to the uploading user, and is dropped after half an hour, so an upload that is never
 * added to a mission never reaches persistent storage.
 */
const pending = new Map<string, PendingUpload>();

function keyOf(userId: string, sha256: string): string {
  return `${userId}:${sha256}`;
}

function dropExpired(now: number): void {
  for (const [key, upload] of pending) {
    if (upload.expiresAt <= now) {
      pending.delete(key);
    }
  }
}

/** Keeps an upload for its user; false when the waiting room is full. */
export function rememberUpload(userId: string, file: UploadedFile, now = Date.now()): boolean {
  dropExpired(now);
  const key = keyOf(userId, file.sha256);
  pending.delete(key);
  const mine = [...pending.values()].filter((upload) => upload.userId === userId);
  const total = [...pending.values()].reduce((sum, upload) => sum + upload.bytes.length, 0);
  if (mine.length >= MAX_PENDING_PER_USER || total + file.bytes.length > MAX_PENDING_BYTES) {
    return false;
  }
  pending.set(key, { ...file, userId, expiresAt: now + PENDING_LIFETIME_MS });
  return true;
}

export function pendingUpload(userId: string, sha256: string, now = Date.now()): UploadedFile | null {
  dropExpired(now);
  return pending.get(keyOf(userId, sha256)) ?? null;
}

export function forgetUpload(userId: string, sha256: string): void {
  pending.delete(keyOf(userId, sha256));
}

/** For tests. */
export function clearPendingUploads(): void {
  pending.clear();
}

/** A file name from the client, reduced to a plain name without folders or control characters. */
export function safeFileName(raw: unknown): string | null {
  if (typeof raw !== "string") {
    return null;
  }
  const base = raw.split(/[\\/]/).pop() ?? "";
  // eslint-disable-next-line no-control-regex
  const cleaned = base.replace(/[\u0000-\u001f\u007f<>:"|?*]/g, "").trim();
  if (cleaned === "" || cleaned === "." || cleaned === "..") {
    return null;
  }
  return cleaned.slice(0, MAX_FILE_NAME_LENGTH);
}

export class UploadTooLargeError extends Error {}

/**
 * Reads an uploaded file: the `assetfile` part of a multipart body, as ATAK sends it, or the raw
 * body. Null when the request carries no file. Throws `UploadTooLargeError` above the limit.
 */
export async function readUploadedFile(request: Request): Promise<{ bytes: Uint8Array; fileName: string | null } | null> {
  const type = request.headers["content-type"] ?? "";
  if (type.toLowerCase().startsWith("multipart/form-data")) {
    return readMultipart(request);
  }
  const bytes = await readStream(request);
  return bytes.length === 0 ? null : { bytes, fileName: null };
}

function readStream(stream: NodeJS.ReadableStream): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let size = 0;
    stream.on("data", (chunk: Buffer) => {
      size += chunk.length;
      if (size > MAX_MISSION_FILE_BYTES) {
        stream.removeAllListeners("data");
        stream.resume();
        reject(new UploadTooLargeError());
        return;
      }
      chunks.push(chunk);
    });
    stream.on("end", () => {
      resolve(new Uint8Array(Buffer.concat(chunks)));
    });
    stream.on("error", reject);
  });
}

function readMultipart(request: Request): Promise<{ bytes: Uint8Array; fileName: string | null } | null> {
  return new Promise((resolve, reject) => {
    let parser: busboy.Busboy;
    try {
      parser = busboy({ headers: request.headers, limits: { files: 1, fileSize: MAX_MISSION_FILE_BYTES, fields: 20, parts: 30 } });
    } catch (error: unknown) {
      reject(error instanceof Error ? error : new Error("Invalid multipart upload."));
      return;
    }
    let found: Promise<{ bytes: Uint8Array; fileName: string | null }> | null = null;
    parser.on("file", (field, stream, info) => {
      if (field !== "assetfile" || found !== null) {
        stream.resume();
        return;
      }
      let truncated = false;
      stream.on("limit", () => {
        truncated = true;
      });
      found = readStream(stream).then((bytes) => {
        if (truncated) {
          throw new UploadTooLargeError();
        }
        return { bytes, fileName: info.filename };
      });
    });
    parser.on("close", () => {
      if (found === null) {
        resolve(null);
      } else {
        found.then(resolve, reject);
      }
    });
    parser.on("error", reject);
    request.pipe(parser);
  });
}

export function sha256Of(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}
