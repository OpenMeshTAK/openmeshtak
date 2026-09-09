import type { NextFunction, Request, Response } from "express";
import { ValidateError } from "tsoa";
import { ProblemError } from "./problem-error.js";
import { logger } from "../logging/logger.js";
import { getTraceId } from "../logging/request-logging.js";

export interface ProblemDetails {
  type: string;
  title: string;
  status: number;
  detail: string;
  code: string;
  traceId: string;
  errors?: Array<{
    field: string;
    code: string;
    message: string;
  }>;
}

export function sendProblem(response: Response, problem: ProblemDetails): void {
  response.status(problem.status).type("application/problem+json").send(problem);
}

export function notFoundHandler(request: Request, response: Response): void {
  sendProblem(response, {
    type: "urn:openmeshtak:problem:not-found",
    title: "Resource not found",
    status: 404,
    detail: "The requested resource does not exist.",
    code: "NOT_FOUND",
    traceId: getTraceId(request),
  });
}

export function errorHandler(
  error: unknown,
  request: Request,
  response: Response,
  next: NextFunction,
): void {
  if (response.headersSent) {
    next(error);
    return;
  }

  const traceId = getTraceId(request);

  if (error instanceof ValidateError) {
    const errors = Object.entries(error.fields).map(([field, issue]) => ({
      field,
      code: "INVALID",
      message: issue.message ?? "The value is invalid.",
    }));

    sendProblem(response, {
      type: "urn:openmeshtak:problem:validation-failed",
      title: "Request validation failed",
      status: 422,
      detail: "One or more fields are invalid.",
      code: "VALIDATION_FAILED",
      traceId,
      errors,
    });
    return;
  }

  if (error instanceof ProblemError) {
    sendProblem(response, {
      type: error.type,
      title: error.title,
      status: error.status,
      detail: error.message,
      code: error.code,
      traceId,
    });
    return;
  }

  logger.error(
    {
      error,
      event: "unhandled_request_error",
      traceId,
    },
    "Unhandled request error",
  );

  sendProblem(response, {
    type: "urn:openmeshtak:problem:internal-error",
    title: "Internal server error",
    status: 500,
    detail: "The request could not be completed.",
    code: "INTERNAL_ERROR",
    traceId,
  });
}
