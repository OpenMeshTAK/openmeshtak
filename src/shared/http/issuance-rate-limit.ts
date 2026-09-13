import { rateLimit, type RateLimitRequestHandler } from "express-rate-limit";
import { sendProblem } from "../errors/problem.js";
import { getTraceId } from "../logging/request-logging.js";

/**
 * Caps how fast one client can mint credentials such as API keys or access links (SECURITY.md).
 * Limits are generous for real work, for example issuing links for a whole event at once, and stop
 * a hijacked session or script from minting credentials in bulk.
 */
export function issuanceRateLimit(limit: number, what: string): RateLimitRequestHandler {
  return rateLimit({
    windowMs: 15 * 60_000,
    limit,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    handler(request, response): void {
      sendProblem(response, {
        type: "urn:openmeshtak:problem:rate-limited",
        title: `Too many new ${what}`,
        status: 429,
        detail: `Wait a few minutes before creating more ${what}.`,
        code: "RATE_LIMITED",
        traceId: getTraceId(request),
      });
    },
  });
}
