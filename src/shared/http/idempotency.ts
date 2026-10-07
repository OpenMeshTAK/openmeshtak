import { createHash, randomUUID } from "node:crypto";
import type { NextFunction, Request, Response } from "express";
import type { Principal } from "../auth/principal.js";
import { database } from "../database/database.js";
import { isUniqueConstraintError } from "../database/unique-constraint.js";
import { sendProblem } from "../errors/problem.js";
import { logger } from "../logging/logger.js";
import { getTraceId } from "../logging/request-logging.js";

const HEADER = "Idempotency-Key";
const RETENTION_MS = 24 * 60 * 60 * 1000;
// Visible ASCII only: enough for UUIDs, ULIDs and prefixed keys, and safe to store and compare.
const KEY_PATTERN = /^[\x21-\x7e]{1,255}$/;

interface Scope {
  principalType: string;
  principalId: string;
  path: string;
  key: string;
}

/**
 * Lets a client retry a duplicate-sensitive POST safely (API.md, "Idempotency and retries").
 *
 * The first request with a key runs normally and its JSON response is kept for 24 hours, scoped to
 * the caller, the path and the key. A retry with the same request receives that response again,
 * marked with `Idempotent-Replayed: true`. The same key with a different request, or while the first
 * request is still running, is a conflict. Server errors are not kept, so the client may retry them.
 *
 * The response is stored in the database, so use this only on routes whose responses contain no
 * secrets. It must run after authentication.
 */
export function idempotent(request: Request, response: Response, next: NextFunction): void {
  handleIdempotentRequest(request, response, next).catch(next);
}

async function handleIdempotentRequest(request: Request, response: Response, next: NextFunction): Promise<void> {
  const key = request.get(HEADER);
  if (key === undefined) {
    next();
    return;
  }

  const traceId = getTraceId(request);
  if (!KEY_PATTERN.test(key)) {
    sendProblem(response, {
      type: "urn:openmeshtak:problem:validation-failed",
      title: "Request validation failed",
      status: 422,
      detail: "One or more fields are invalid.",
      code: "VALIDATION_FAILED",
      traceId,
      errors: [
        {
          field: `header.${HEADER}`,
          code: "INVALID",
          message: "Use 1 to 255 visible ASCII characters.",
        },
      ],
    });
    return;
  }

  const principal = (request as Request & { user?: Principal }).user;
  if (principal === undefined) {
    throw new Error("Idempotent route reached without an authenticated principal.");
  }

  const scope: Scope = {
    principalType: principal.type,
    principalId: principal.id,
    path: `${request.baseUrl}${request.path}`,
    key,
  };
  const requestHash = hashRequest(request);
  const now = new Date();

  // Expired results are removed here instead of by a scheduled job; the table stays small.
  await database.idempotencyRecord.deleteMany({ where: { expiresAt: { lte: now } } });

  try {
    const record = await database.idempotencyRecord.create({
      data: { id: randomUUID(), ...scope, requestHash, expiresAt: new Date(now.getTime() + RETENTION_MS) },
    });
    recordResponse(response, record.id);
  } catch (error) {
    if (!isUniqueConstraintError(error)) {
      throw error;
    }
    await answerRepeatedRequest(response, scope, requestHash, traceId);
    return;
  }

  next();
}

/** The hash covers everything besides the path that decides what the request does. */
function hashRequest(request: Request): string {
  return createHash("sha256")
    .update(canonicalJson({ query: request.query, body: request.body as unknown }))
    .digest("hex");
}

/** JSON with sorted object keys, so equal requests hash equally regardless of key order. */
function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map(canonicalJson).join(",")}]`;
  }
  if (typeof value === "object" && value !== null) {
    const entries = Object.entries(value)
      .filter(([, item]) => item !== undefined)
      .sort(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0))
      .map(([name, item]) => `${JSON.stringify(name)}:${canonicalJson(item)}`);
    return `{${entries.join(",")}}`;
  }
  return JSON.stringify(value) ?? "null";
}

async function answerRepeatedRequest(
  response: Response,
  scope: Scope,
  requestHash: string,
  traceId: string,
): Promise<void> {
  const existing = await database.idempotencyRecord.findUnique({
    where: { principalType_principalId_path_key: scope },
  });

  if (existing !== null && existing.requestHash !== requestHash) {
    sendProblem(response, {
      type: "urn:openmeshtak:problem:idempotency-key-reused",
      title: "Idempotency key reused",
      status: 409,
      detail: "This Idempotency-Key was already used with a different request.",
      code: "IDEMPOTENCY_KEY_REUSED",
      traceId,
    });
    return;
  }

  // A missing record means the first request just failed and released the key.
  if (existing?.responseStatus === null || existing?.responseStatus === undefined) {
    response.setHeader("Retry-After", "1");
    sendProblem(response, {
      type: "urn:openmeshtak:problem:idempotency-request-in-progress",
      title: "Request in progress",
      status: 409,
      detail: "A request with this Idempotency-Key is still running. Retry shortly.",
      code: "IDEMPOTENCY_REQUEST_IN_PROGRESS",
      traceId,
    });
    return;
  }

  response.status(existing.responseStatus).setHeader("Idempotent-Replayed", "true");
  if (existing.responseBody === null) {
    response.end();
    return;
  }
  response.type(existing.responseContentType ?? "application/json").send(existing.responseBody);
}

/**
 * Captures the JSON body the route sends and stores it once the response is complete. tsoa and the
 * problem handler both answer through `response.json`; a route that streams is not stored.
 */
function recordResponse(response: Response, recordId: string): void {
  let body: string | undefined;
  const sendJson = response.json.bind(response);
  response.json = (value: unknown) => {
    body = JSON.stringify(value);
    return sendJson(value);
  };

  response.on("close", () => {
    const status = response.statusCode;
    const keep = response.writableFinished && status < 500 && (body !== undefined || status === 204);
    const stored = keep
      ? database.idempotencyRecord.update({
          where: { id: recordId },
          data: {
            responseStatus: status,
            responseContentType: response.get("Content-Type") ?? null,
            responseBody: body ?? null,
          },
        })
      : database.idempotencyRecord.delete({ where: { id: recordId } });

    stored.catch((error: unknown) => {
      logger.error({ error, event: "idempotency_record_failed" }, "Could not store an idempotent response");
      // Never leave the key blocked as "in progress" for a whole day.
      database.idempotencyRecord.deleteMany({ where: { id: recordId } }).catch(() => undefined);
    });
  });
}
