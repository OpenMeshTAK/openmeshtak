import type { Request } from "express";
import { auth } from "../../modules/auth/auth.js";
import { authenticateApiKey } from "../../modules/api-clients/api-key-authentication.js";
import { database } from "../database/database.js";
import { ProblemError } from "../errors/problem-error.js";
import { getTraceId } from "../logging/request-logging.js";
import type { Principal, ApiClientPrincipal, UserPrincipal } from "./principal.js";

export const SESSION_SECURITY = "sessionCookie";
export const API_CLIENT_SECURITY = "apiClientBearer";

function requestHeaders(request: Request): Headers {
  const headers = new Headers();

  for (const [name, value] of Object.entries(request.headers)) {
    if (Array.isArray(value)) {
      for (const item of value) {
        headers.append(name, item);
      }
    } else if (value !== undefined) {
      headers.set(name, value);
    }
  }

  return headers;
}

/** Every authentication failure uses this one response so callers cannot probe why it failed. */
function authenticationRequired(): ProblemError {
  return new ProblemError({
    type: "urn:openmeshtak:problem:authentication-required",
    title: "Authentication required",
    status: 401,
    detail: "A valid interactive session or machine credential is required.",
    code: "AUTHENTICATION_REQUIRED",
  });
}

async function authenticateSession(request: Request): Promise<UserPrincipal> {
  const session = await auth.api.getSession({
    headers: requestHeaders(request),
  });

  if (session === null) {
    throw authenticationRequired();
  }

  const domainUser = await database.domainUser.findUnique({
    where: {
      authSubjectId: session.user.id,
    },
    select: {
      id: true,
      disabledAt: true,
    },
  });

  // Sessions are deleted when an account is disabled; this also covers any that slipped through.
  if (domainUser === null || domainUser.disabledAt !== null) {
    throw authenticationRequired();
  }

  return {
    type: "user",
    id: domainUser.id,
    authSubjectId: session.user.id,
    sessionCreatedAt: new Date(session.session.createdAt),
  };
}

async function authenticateApiClient(request: Request): Promise<ApiClientPrincipal> {
  const principal = await authenticateApiKey(request.headers.authorization, getTraceId(request));

  if (principal === null) {
    throw authenticationRequired();
  }

  return principal;
}

/**
 * tsoa authentication module. Each operation declares its accepted schemes explicitly; a route
 * documented for sessions never silently accepts an API key and vice versa.
 */
export async function expressAuthentication(
  request: Request,
  securityName: string,
): Promise<Principal> {
  switch (securityName) {
    case SESSION_SECURITY:
      return authenticateSession(request);
    case API_CLIENT_SECURITY:
      return authenticateApiClient(request);
    default:
      throw authenticationRequired();
  }
}
