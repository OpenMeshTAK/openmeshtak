import { rateLimit } from "express-rate-limit";
import { sendProblem } from "../../shared/errors/problem.js";
import { getTraceId } from "../../shared/logging/request-logging.js";

/** Counts every attempt per client address, so open registration cannot mass-create accounts. */
export const registrationRateLimit = rateLimit({
  windowMs: 15 * 60_000,
  limit: 10,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  handler(request, response): void {
    sendProblem(response, {
      type: "urn:openmeshtak:problem:rate-limited",
      title: "Too many registration attempts",
      status: 429,
      detail: "Wait before trying to create an account again.",
      code: "RATE_LIMITED",
      traceId: getTraceId(request),
    });
  },
});
