import { database } from "../database/database.js";
import { ProblemError } from "../errors/problem-error.js";
import { INSTANCE_SCOPE_KEY, scopeKeyFor, type Permission } from "./permissions.js";
import type { Principal, UserPrincipal } from "./principal.js";

/**
 * Step-up window for sensitive credential actions such as creating API keys. Routine work is not
 * affected; only the listed sensitive operations ask for a recent sign-in.
 */
export const RECENT_AUTHENTICATION_MAX_AGE_SECONDS = 10 * 60;

function acceptedScopeKeys(eventId: string | null): string[] {
  // An instance-wide grant also covers every event-scoped check.
  return eventId === null ? [INSTANCE_SCOPE_KEY] : [INSTANCE_SCOPE_KEY, scopeKeyFor(eventId)];
}

/**
 * Loads current grants from the database on every call. There is no cached role or bypass:
 * the initial Admin group simply holds every registered permission.
 */
export async function hasPermission(
  principal: Principal,
  permission: Permission,
  eventId: string | null = null,
): Promise<boolean> {
  const scopeKey = { in: acceptedScopeKeys(eventId) };

  if (principal.type === "user") {
    const grant = await database.permissionGrant.findFirst({
      where: {
        permission,
        scopeKey,
        userGroup: { memberships: { some: { userId: principal.id } } },
      },
      select: { id: true },
    });
    return grant !== null;
  }

  const grant = await database.serviceAccountPermissionGrant.findFirst({
    where: {
      permission,
      scopeKey,
      serviceAccount: { id: principal.id, status: "active" },
    },
    select: { id: true },
  });
  return grant !== null;
}

/** Event visibility for list queries: every event, or only the explicitly granted ones. */
export type EventAccess = { all: true } | { all: false; eventIds: string[] };

export async function eventAccessFor(
  principal: Principal,
  permission: Permission,
): Promise<EventAccess> {
  const grants =
    principal.type === "user"
      ? await database.permissionGrant.findMany({
          where: { permission, userGroup: { memberships: { some: { userId: principal.id } } } },
          select: { scopeKey: true, eventId: true },
        })
      : await database.serviceAccountPermissionGrant.findMany({
          where: { permission, serviceAccount: { id: principal.id, status: "active" } },
          select: { scopeKey: true, eventId: true },
        });

  if (grants.some(({ scopeKey }) => scopeKey === INSTANCE_SCOPE_KEY)) {
    return { all: true };
  }
  return {
    all: false,
    eventIds: grants.flatMap(({ eventId }) => (eventId === null ? [] : [eventId])),
  };
}

export function forbidden(): ProblemError {
  return new ProblemError({
    type: "urn:openmeshtak:problem:forbidden",
    title: "Access denied",
    status: 403,
    detail: "You do not have permission to perform this action.",
    code: "FORBIDDEN",
  });
}

export async function requirePermission(
  principal: Principal,
  permission: Permission,
  eventId: string | null = null,
): Promise<void> {
  if (!(await hasPermission(principal, permission, eventId))) {
    throw forbidden();
  }
}

export function requireRecentAuthentication(principal: UserPrincipal, now = new Date()): void {
  const ageSeconds = (now.getTime() - principal.sessionCreatedAt.getTime()) / 1000;

  if (ageSeconds > RECENT_AUTHENTICATION_MAX_AGE_SECONDS) {
    throw new ProblemError({
      type: "urn:openmeshtak:problem:recent-authentication-required",
      title: "Recent sign-in required",
      status: 403,
      detail: "Sign in again before performing this sensitive action.",
      code: "RECENT_AUTHENTICATION_REQUIRED",
    });
  }
}
