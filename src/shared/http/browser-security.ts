import type { NextFunction, Request, Response } from "express";
import { config } from "../config/config.js";
import { sendProblem } from "../errors/problem.js";
import { getTraceId } from "../logging/request-logging.js";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);
const publicOrigin = new URL(config.publicOrigin).origin;

/**
 * Web and API share one origin and Core sends no CORS headers, so browsers never let another site
 * read API responses. API responses are per-user and may carry setup, claim or credential data, so
 * they must never be stored by browsers, proxies or the PWA service worker.
 */
export function apiResponseHeaders(_request: Request, response: Response, next: NextFunction): void {
  response.setHeader("Cache-Control", "no-store");
  // JSON never needs to load anything or be framed.
  response.setHeader("Content-Security-Policy", "default-src 'none'; frame-ancestors 'none'");
  next();
}

/**
 * CSRF defense for cookie-authenticated changes (SECURITY.md): browsers attach `Origin` to every
 * cross-origin POST/PUT/DELETE, and `Sec-Fetch-Site` where supported. A request that a browser
 * marks as coming from another site is rejected before authentication runs. Requests without
 * these headers do not come from a browser and cannot ride on a victim's cookies. Bearer-key
 * requests are exempt because a cross-site page cannot set `Authorization` without a CORS
 * preflight, which Core never grants.
 */
export function rejectCrossSiteRequests(request: Request, response: Response, next: NextFunction): void {
  if (SAFE_METHODS.has(request.method) || request.headers.authorization?.startsWith("Bearer ") === true) {
    next();
    return;
  }

  const origin = request.headers.origin;
  const fetchSite = request.headers["sec-fetch-site"];
  const foreignOrigin = origin !== undefined && origin !== publicOrigin;
  if (foreignOrigin || fetchSite === "cross-site") {
    sendProblem(response, {
      type: "urn:openmeshtak:problem:cross-site-request",
      title: "Cross-site request rejected",
      status: 403,
      detail: "Changes must be sent from the OpenMeshTak web application.",
      code: "CROSS_SITE_REQUEST",
      traceId: getTraceId(request),
    });
    return;
  }
  next();
}
