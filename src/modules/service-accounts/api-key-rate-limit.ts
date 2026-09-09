import type { Request, RequestHandler } from "express";
import { rateLimit } from "express-rate-limit";
import { sendProblem } from "../../shared/errors/problem.js";
import { getTraceId } from "../../shared/logging/request-logging.js";

const FAILURE_WINDOW_MS = 15 * 60_000;
const MAX_FAILURES_PER_WINDOW = 20;

function carriesApiKey(request: Request): boolean {
  return /^bearer\s+omtk_sa_/i.test(request.headers.authorization ?? "");
}

/**
 * Counts only rejected API-key requests per client address. Once the limit is reached, requests
 * are refused before key lookup, which stops online guessing and keeps failed attempts from
 * filling the audit log. Successful machine traffic never consumes the budget.
 */
export function createApiKeyFailureRateLimit(): RequestHandler {
  return rateLimit({
    windowMs: FAILURE_WINDOW_MS,
    limit: MAX_FAILURES_PER_WINDOW,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    skip: (request) => !carriesApiKey(request),
    skipSuccessfulRequests: true,
    requestWasSuccessful: (_request, response) => response.statusCode !== 401,
    handler(request, response): void {
      sendProblem(response, {
        type: "urn:openmeshtak:problem:rate-limited",
        title: "Too many failed authentication attempts",
        status: 429,
        detail: "Wait before retrying with a valid API key.",
        code: "RATE_LIMITED",
        traceId: getTraceId(request),
      });
    },
  });
}
