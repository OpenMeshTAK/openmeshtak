import { randomUUID } from "node:crypto";
import { performance } from "node:perf_hooks";
import type { NextFunction, Request, RequestHandler, Response } from "express";
import { logger } from "./logger.js";

export type RequestWithTraceId = Request & { traceId: string };

export function getTraceId(request: Request): string {
  return (request as Partial<RequestWithTraceId>).traceId ?? randomUUID();
}

export const requestLogging: RequestHandler = (
  request: Request,
  response: Response,
  next: NextFunction,
): void => {
  const traceId = randomUUID();
  const startedAt = performance.now();

  (request as RequestWithTraceId).traceId = traceId;
  response.setHeader("X-Trace-Id", traceId);

  response.once("finish", () => {
    const route = request.route as { path?: unknown } | undefined;

    logger.info(
      {
        durationMs: Math.round((performance.now() - startedAt) * 100) / 100,
        event: "http_request_completed",
        method: request.method,
        route: typeof route?.path === "string" ? route.path : "unmatched",
        statusCode: response.statusCode,
        traceId,
      },
      "HTTP request completed",
    );
  });

  next();
};
