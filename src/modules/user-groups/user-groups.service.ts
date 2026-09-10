import { randomUUID } from "node:crypto";
import type { Prisma } from "../../generated/prisma/client.js";
import { recordAudit } from "../../shared/audit/audit.js";
import { requirePermission } from "../../shared/auth/permission-check.js";
import {
  requireDelegableGrants,
  validatePermissionGrants,
  type ValidatedGrant,
} from "../../shared/auth/permission-grants.js";
import type { Permission } from "../../shared/auth/permissions.js";
import type { ActorContext, Principal } from "../../shared/auth/principal.js";
import { database } from "../../shared/database/database.js";
import { isUniqueConstraintError } from "../../shared/database/unique-constraint.js";
import {
  notFoundProblem,
  ProblemError,
  slugConflictProblem,
  versionConflictProblem,
} from "../../shared/errors/problem-error.js";
import {
  afterCursor,
  CURSOR_ORDER,
  DEFAULT_PAGE_LIMIT,
  decodeCursor,
  toPage,
} from "../../shared/pagination/cursor.js";
import type {
  CreateUserGroupRequest,
  UpdateUserGroupRequest,
  UserGroupDto,
  UserGroupPage,
} from "./user-group.dto.js";

const LIST_CONTEXT = "user-groups";

const userGroupSelection = {
  id: true,
  name: true,
  slug: true,
  systemKey: true,
  version: true,
  createdAt: true,
  updatedAt: true,
  _count: { select: { memberships: true } },
  permissionGrants: {
    select: { permission: true, eventId: true, scopeKey: true },
    orderBy: [{ permission: "asc" }, { scopeKey: "asc" }],
  },
} satisfies Prisma.UserGroupSelect;

type UserGroupRow = Prisma.UserGroupGetPayload<{ select: typeof userGroupSelection }>;

function toDto(row: UserGroupRow): UserGroupDto {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    system: row.systemKey !== null,
    version: row.version,
    memberCount: row._count.memberships,
    // Stored names were validated against the catalog when the grant was written.
    permissions: row.permissionGrants.map(({ permission, eventId }) => ({
      permission: permission as Permission,
      eventId,
    })),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export function systemGroupProtected(detail: string): ProblemError {
  return new ProblemError({
    type: "urn:openmeshtak:problem:system-group-protected",
    title: "System group is protected",
    status: 409,
    detail,
    code: "SYSTEM_GROUP_PROTECTED",
  });
}

function slugConflict(error: unknown): unknown {
  return isUniqueConstraintError(error)
    ? slugConflictProblem("Another user group already uses this slug.")
    : error;
}

function grantIdentities(grants: Array<{ permission: string; scopeKey: string }>): Set<string> {
  return new Set(grants.map(({ permission, scopeKey }) => `${permission}|${scopeKey}`));
}

function grantRows(userGroupId: string, grants: ValidatedGrant[]) {
  return grants.map((grant) => ({
    id: randomUUID(),
    userGroupId,
    permission: grant.permission,
    scopeKey: grant.scopeKey,
    eventId: grant.eventId,
  }));
}

function grantSummary(grants: ValidatedGrant[]): string[] {
  return grants.map(({ permission, scopeKey }) => `${permission}@${scopeKey}`);
}

export async function findUserGroupRow(id: string): Promise<UserGroupRow> {
  const row = await database.userGroup.findUnique({ where: { id }, select: userGroupSelection });
  if (row === null) {
    throw notFoundProblem();
  }
  return row;
}

export async function listUserGroups(
  principal: Principal,
  limit = DEFAULT_PAGE_LIMIT,
  cursor?: string,
): Promise<UserGroupPage> {
  await requirePermission(principal, "user-groups.read");
  const position = cursor === undefined ? null : decodeCursor(LIST_CONTEXT, cursor);

  const rows = await database.userGroup.findMany({
    where: afterCursor(position),
    orderBy: [...CURSOR_ORDER],
    take: limit + 1,
    select: userGroupSelection,
  });
  return toPage(LIST_CONTEXT, rows, limit, toDto);
}

export async function getUserGroup(principal: Principal, id: string): Promise<UserGroupDto> {
  await requirePermission(principal, "user-groups.read");
  return toDto(await findUserGroupRow(id));
}

export async function createUserGroup(
  actor: ActorContext,
  input: CreateUserGroupRequest,
): Promise<UserGroupDto> {
  await requirePermission(actor.principal, "user-groups.manage");
  const grants = await validatePermissionGrants(input.permissions);
  await requireDelegableGrants(actor.principal, grants);
  const id = randomUUID();

  try {
    await database.$transaction(async (transaction) => {
      await transaction.userGroup.create({ data: { id, name: input.name, slug: input.slug } });
      await transaction.permissionGrant.createMany({ data: grantRows(id, grants) });
      await recordAudit(
        {
          actor: actor.principal,
          action: "user-group.created",
          targetType: "user-group",
          targetId: id,
          result: "success",
          traceId: actor.traceId,
          metadata: { slug: input.slug, permissions: grantSummary(grants) },
        },
        transaction,
      );
    });
  } catch (error: unknown) {
    throw slugConflict(error);
  }

  return toDto(await findUserGroupRow(id));
}

export async function updateUserGroup(
  actor: ActorContext,
  id: string,
  input: UpdateUserGroupRequest,
): Promise<UserGroupDto> {
  await requirePermission(actor.principal, "user-groups.manage");
  const current = await findUserGroupRow(id);
  if (current.version !== input.version) {
    throw versionConflictProblem(current.version);
  }

  const grants = await validatePermissionGrants(input.permissions);
  const existing = grantIdentities(current.permissionGrants);
  const requested = grantIdentities(grants);
  const grantsChanged =
    existing.size !== requested.size || [...requested].some((grant) => !existing.has(grant));

  if (current.systemKey !== null && grantsChanged) {
    throw systemGroupProtected("The permissions of a system group cannot be changed.");
  }
  await requireDelegableGrants(actor.principal, grants, existing);

  try {
    await database.$transaction(async (transaction) => {
      const updated = await transaction.userGroup.updateMany({
        where: { id, version: input.version },
        data: { name: input.name, slug: input.slug, version: { increment: 1 } },
      });
      if (updated.count !== 1) {
        const latest = await transaction.userGroup.findUnique({ where: { id }, select: { version: true } });
        throw latest === null ? notFoundProblem() : versionConflictProblem(latest.version);
      }

      if (grantsChanged) {
        await transaction.permissionGrant.deleteMany({ where: { userGroupId: id } });
        await transaction.permissionGrant.createMany({ data: grantRows(id, grants) });
      }

      await recordAudit(
        {
          actor: actor.principal,
          action: "user-group.updated",
          targetType: "user-group",
          targetId: id,
          result: "success",
          traceId: actor.traceId,
          metadata: { slug: input.slug, permissions: grantSummary(grants) },
        },
        transaction,
      );
    });
  } catch (error: unknown) {
    throw slugConflict(error);
  }

  return toDto(await findUserGroupRow(id));
}

/** Deleting a group removes its memberships and grants; affected users lose access immediately. */
export async function deleteUserGroup(actor: ActorContext, id: string): Promise<void> {
  await requirePermission(actor.principal, "user-groups.manage");
  const current = await findUserGroupRow(id);
  if (current.systemKey !== null) {
    throw systemGroupProtected("System groups cannot be deleted.");
  }

  await database.$transaction(async (transaction) => {
    await transaction.userGroup.delete({ where: { id } });
    await recordAudit(
      {
        actor: actor.principal,
        action: "user-group.deleted",
        targetType: "user-group",
        targetId: id,
        result: "success",
        traceId: actor.traceId,
        metadata: { slug: current.slug, memberCount: current._count.memberships },
      },
      transaction,
    );
  });
}
