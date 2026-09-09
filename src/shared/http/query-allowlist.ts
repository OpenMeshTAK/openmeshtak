import type { NextFunction, Request, RequestHandler, Response } from "express";
import { sendProblem } from "../errors/problem.js";
import { getTraceId } from "../logging/request-logging.js";

/**
 * tsoa validates declared query parameters but ignores undeclared ones. The API contract rejects
 * unknown filters instead of silently returning an unfiltered list.
 */
export function allowQueryParameters(...allowed: string[]): RequestHandler {
  const allowedNames = new Set(allowed);

  return (request: Request, response: Response, next: NextFunction): void => {
    const unknown = Object.keys(request.query).filter((name) => !allowedNames.has(name));

    if (unknown.length === 0) {
      next();
      return;
    }

    sendProblem(response, {
      type: "urn:openmeshtak:problem:validation-failed",
      title: "Request validation failed",
      status: 422,
      detail: "One or more query parameters are not supported.",
      code: "VALIDATION_FAILED",
      traceId: getTraceId(request),
      errors: unknown.map((name) => ({
        field: `query.${name}`,
        code: "UNSUPPORTED",
        message: "This query parameter is not supported.",
      })),
    });
  };
}
