import type { Request, Response } from "express";
import { logger } from "../../shared/logging/logger.js";
import type { AuthenticatedTakClient } from "../tak-server/client-authentication.js";
import { visibleMissionsFor } from "./mission-access.js";
import { missionFileByHash } from "./mission-files.js";
import { pendingUpload, readUploadedFile, rememberUpload, safeFileName, sha256Of, UploadTooLargeError, type UploadedFile } from "./tak-uploads.js";

type Locals = { client: AuthenticatedTakClient };

/** Formats a time the way TAK Server does in sync metadata. */
function martiTime(date: Date): string {
  return date.toISOString().replace(/\.\d{3}Z$/, ".000Z");
}

/**
 * Reads and checks an upload. Only members who may change at least one mission may upload, since
 * an upload is only useful once it is added to a mission. Answers the request itself on failure.
 */
async function receive(request: Request, response: Response<unknown, Locals>): Promise<UploadedFile | null> {
  const { client } = response.locals;
  const missions = await visibleMissionsFor(client.userId, client.access);
  if (!missions.some(({ canWrite }) => canWrite)) {
    request.resume();
    response.status(403).end();
    return null;
  }
  let received: Awaited<ReturnType<typeof readUploadedFile>>;
  try {
    received = await readUploadedFile(request);
  } catch (error: unknown) {
    response.status(error instanceof UploadTooLargeError ? 413 : 400).end();
    return null;
  }
  const fileName = safeFileName(request.query.filename) ?? safeFileName(request.query.name) ?? safeFileName(received?.fileName);
  if (received === null || fileName === null) {
    response.status(400).end();
    return null;
  }
  const sha256 = sha256Of(received.bytes);
  const declared = request.query.hash;
  if (typeof declared === "string" && declared !== "" && declared.toLowerCase() !== sha256) {
    response.status(400).end();
    return null;
  }
  const file = { sha256, fileName, bytes: received.bytes, uploadedAt: new Date() };
  if (!rememberUpload(client.userId, file)) {
    response.status(503).end();
    return null;
  }
  logger.info({ event: "tak_upload_received", userId: client.userId, size: file.bytes.length }, "TAK upload received");
  return file;
}

function contentUrl(request: Request, sha256: string): string {
  return `https://${request.headers.host ?? ""}/Marti/sync/content?hash=${sha256}`;
}

/**
 * `POST|PUT /Marti/sync/missionupload?hash=&filename=&creatorUid=` with the file as multipart
 * `assetfile`. Answers with the download URL as plain text.
 */
export async function missionUpload(request: Request, response: Response<unknown, Locals>): Promise<void> {
  const file = await receive(request, response);
  if (file !== null) {
    response.status(200).type("text/plain").send(contentUrl(request, file.sha256));
  }
}

/**
 * `POST /Marti/sync/upload?name=&creatorUid=` with the file as raw body or multipart `assetfile`.
 * Answers with the stored file's metadata, as TAK Server's Enterprise Sync does.
 */
export async function syncUpload(request: Request, response: Response<unknown, Locals>): Promise<void> {
  const file = await receive(request, response);
  if (file !== null) {
    response.json({
      UID: file.sha256,
      Name: file.fileName,
      SubmissionDateTime: martiTime(file.uploadedAt),
      MIMEType: "application/octet-stream",
      SubmissionUser: "",
      CreatorUid: typeof request.query.creatorUid === "string" ? request.query.creatorUid.slice(0, 200) : "",
      PrimaryKey: Number.parseInt(file.sha256.slice(0, 7), 16),
      Hash: file.sha256,
      Size: file.bytes.length,
    });
  }
}

/** Whether the server already has a file with this hash for the caller, so the app need not upload it. */
export async function knowsUpload(client: AuthenticatedTakClient, hash: string): Promise<boolean> {
  return pendingUpload(client.userId, hash) !== null || (await missionFileByHash(client.userId, client.access, hash)) !== null;
}
