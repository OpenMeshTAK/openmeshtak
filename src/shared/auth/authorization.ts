import type { Request } from "express";
import { auth } from "../../modules/auth/auth.js";
import { database } from "../database/database.js";
import { ProblemError } from "../errors/problem-error.js";

export interface InteractivePrincipal {
  type: "user";
  id: string;
  authSubjectId: string;
}

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

function authenticationRequired(): ProblemError {
  return new ProblemError({
    type: "urn:openmeshtak:problem:authentication-required",
    title: "Authentication required",
    status: 401,
    detail: "A valid interactive session or machine credential is required.",
    code: "AUTHENTICATION_REQUIRED",
  });
}

export async function expressAuthentication(
  request: Request,
  securityName: string,
): Promise<InteractivePrincipal> {
  if (securityName !== "sessionCookie") {
    throw authenticationRequired();
  }

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
    },
  });

  if (domainUser === null) {
    throw authenticationRequired();
  }

  return {
    type: "user",
    id: domainUser.id,
    authSubjectId: session.user.id,
  };
}
