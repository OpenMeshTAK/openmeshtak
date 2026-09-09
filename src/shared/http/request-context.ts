import type { Request, Response } from "express";
import type { Principal, UserPrincipal } from "../auth/principal.js";
import { getTraceId } from "../logging/request-logging.js";

export interface RequestContext {
  principal: Principal;
  traceId: string;
  response: Response | undefined;
}

/**
 * Controllers receive the Express request as `unknown` so tsoa does not try to describe it in
 * OpenAPI. tsoa stores the authentication result on `request.user`.
 */
export function requestContext(request: unknown): RequestContext {
  const expressRequest = request as Request & { user?: Principal };

  if (expressRequest.user === undefined) {
    throw new Error("Protected route reached without an authenticated principal.");
  }

  return {
    principal: expressRequest.user,
    traceId: getTraceId(expressRequest),
    response: expressRequest.res,
  };
}

export function requireUserPrincipal(principal: Principal): UserPrincipal {
  if (principal.type !== "user") {
    throw new Error("Route requires an interactive user principal.");
  }
  return principal;
}

export function preventCaching(context: RequestContext): void {
  context.response?.setHeader("Cache-Control", "no-store");
}
