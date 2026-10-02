import type { Express, NextFunction, Request, Response } from "express";
import { toNodeHandler } from "better-auth/node";
import { AUTH_BASE_PATH, auth } from "./auth.js";
import { sendProblem } from "../../shared/errors/problem.js";
import { getTraceId } from "../../shared/logging/request-logging.js";

const handler = toNodeHandler(auth);

/**
 * Better Auth endpoints OpenMeshTak does not offer: accounts come from setup, administrators and
 * access links, never from public sign-up, and a public username lookup would let anyone collect
 * valid TAK login names. OpenMeshTak checks availability itself inside account setup.
 */
const BLOCKED_PATHS = new Set([`${AUTH_BASE_PATH}/sign-up/email`, `${AUTH_BASE_PATH}/is-username-available`]);

export function mountAuthRoutes(app: Express): void {
  app.all(`${AUTH_BASE_PATH}/*`, (request: Request, response: Response, next: NextFunction) => {
    if (BLOCKED_PATHS.has(request.path)) {
      sendProblem(response, {
        type: "urn:openmeshtak:problem:not-found",
        title: "Resource not found",
        status: 404,
        detail: "The requested resource does not exist.",
        code: "NOT_FOUND",
        traceId: getTraceId(request),
      });
      return;
    }

    Promise.resolve(handler(request, response)).catch(next);
  });
}
