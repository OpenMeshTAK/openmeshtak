import { rateLimit } from "express-rate-limit";
import { sendProblem } from "../../shared/errors/problem.js";
import { getTraceId } from "../../shared/logging/request-logging.js";

/**
 * Counts only failed exchanges per client address, so guessing is throttled while a participant
 * who mistyped nothing is never slowed down.
 */
export const claimExchangeRateLimit = rateLimit({
  windowMs: 15 * 60_000,
  limit: 20,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  handler(request, response): void {
    sendProblem(response, {
      type: "urn:openmeshtak:problem:rate-limited",
      title: "Too many claim attempts",
      status: 429,
      detail: "Wait before trying the claim link again.",
      code: "RATE_LIMITED",
      traceId: getTraceId(request),
    });
  },
});
