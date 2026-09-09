import { rateLimit } from "express-rate-limit";
import { sendProblem } from "../../shared/errors/problem.js";
import { getTraceId } from "../../shared/logging/request-logging.js";

export const setupRateLimit = rateLimit({
  windowMs: 15 * 60_000,
  limit: 10,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  handler(request, response): void {
    sendProblem(response, {
      type: "urn:openmeshtak:problem:rate-limited",
      title: "Too many setup attempts",
      status: 429,
      detail: "Wait before trying the setup flow again.",
      code: "RATE_LIMITED",
      traceId: getTraceId(request),
    });
  },
});
