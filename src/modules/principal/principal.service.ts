import type { Permission } from "../../shared/auth/permissions.js";
import type { Principal } from "../../shared/auth/principal.js";
import { database } from "../../shared/database/database.js";
import { hasPassword } from "../account/account-setup.service.js";
import type { PermissionGrantDto } from "../../shared/auth/permission-grant.dto.js";

export interface PrincipalDto {
  type: "user" | "api-client";
  /** @format uuid */
  id: string;
  name: string;
  /** Sign-in and TAK login name of a user; `null` for API clients. */
  username: string | null;
  /** Whether a user can sign in with a password, which the TAK login needs; `false` for API clients. */
  hasPassword: boolean;
  /** Effective grants, deduplicated across all sources. */
  permissions: PermissionGrantDto[];
}

interface GrantRow {
  permission: string;
  eventId: string | null;
  scopeKey: string;
}

function uniqueGrants(rows: GrantRow[]): PermissionGrantDto[] {
  const grants = new Map<string, PermissionGrantDto>();
  for (const row of rows) {
    // Stored names were validated against the catalog when the grant was written.
    grants.set(`${row.permission}|${row.scopeKey}`, {
      permission: row.permission as Permission,
      eventId: row.eventId,
    });
  }
  return [...grants.values()];
}

const grantSelection = { permission: true, eventId: true, scopeKey: true } as const;
const grantOrder: Array<{ permission: "asc" } | { scopeKey: "asc" }> = [
  { permission: "asc" },
  { scopeKey: "asc" },
];

export async function describePrincipal(principal: Principal): Promise<PrincipalDto> {
  if (principal.type === "user") {
    const [user, grants] = await Promise.all([
      database.domainUser.findUniqueOrThrow({
        where: { id: principal.id },
        select: { displayName: true, authSubject: { select: { username: true } } },
      }),
      database.permissionGrant.findMany({
        where: { userGroup: { memberships: { some: { userId: principal.id } } } },
        select: grantSelection,
        orderBy: grantOrder,
      }),
    ]);
    return {
      type: "user",
      id: principal.id,
      name: user.displayName,
      username: user.authSubject?.username ?? null,
      hasPassword: await hasPassword(principal.authSubjectId),
      permissions: uniqueGrants(grants),
    };
  }

  const account = await database.apiClient.findUniqueOrThrow({
    where: { id: principal.id },
    select: {
      name: true,
      permissionGrants: { select: grantSelection, orderBy: grantOrder },
    },
  });
  return {
    type: "api-client",
    id: principal.id,
    name: account.name,
    username: null,
    hasPassword: false,
    permissions: uniqueGrants(account.permissionGrants),
  };
}
