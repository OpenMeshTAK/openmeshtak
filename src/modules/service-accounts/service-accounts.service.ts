import { randomUUID } from "node:crypto";
import type { Prisma } from "../../generated/prisma/client.js";
import { recordAudit } from "../../shared/audit/audit.js";
import { requirePermission } from "../../shared/auth/permission-check.js";
import {
  requireDelegableGrants,
  validatePermissionGrants,
} from "../../shared/auth/permission-grants.js";
import type { Permission } from "../../shared/auth/permissions.js";
import type { Principal } from "../../shared/auth/principal.js";
import { database } from "../../shared/database/database.js";
import { notFoundProblem, versionConflictProblem } from "../../shared/errors/problem-error.js";
import {
  afterCursor,
  CURSOR_ORDER,
  DEFAULT_PAGE_LIMIT,
  decodeCursor,
  toPage,
} from "../../shared/pagination/cursor.js";
import type {
  CreateServiceAccountRequest,
  ServiceAccountDto,
  ServiceAccountPage,
  UpdateServiceAccountRequest,
} from "./service-account.dto.js";

const LIST_CONTEXT = "service-accounts";

export interface ActorContext {
  principal: Principal;
  traceId: string;
}

const serviceAccountSelection = {
  id: true,
  name: true,
  description: true,
  status: true,
  version: true,
  createdAt: true,
  updatedAt: true,
  permissionGrants: {
    select: { permission: true, eventId: true, scopeKey: true },
    orderBy: [{ permission: "asc" }, { scopeKey: "asc" }],
  },
} satisfies Prisma.ServiceAccountSelect;

interface ServiceAccountRow {
  id: string;
  name: string;
  description: string | null;
  status: "active" | "disabled";
  version: number;
  createdAt: Date;
  updatedAt: Date;
  permissionGrants: Array<{ permission: string; eventId: string | null; scopeKey: string }>;
}

function toDto(row: ServiceAccountRow): ServiceAccountDto {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    status: row.status,
    version: row.version,
    // Stored names were validated against the catalog when the grant was written.
    permissions: row.permissionGrants.map(({ permission, eventId }) => ({
      permission: permission as Permission,
      eventId,
    })),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

async function findRow(id: string): Promise<ServiceAccountRow> {
  const row = await database.serviceAccount.findUnique({
    where: { id },
    select: serviceAccountSelection,
  });

  if (row === null) {
    throw notFoundProblem();
  }
  return row;
}

export async function listServiceAccounts(
  principal: Principal,
  limit = DEFAULT_PAGE_LIMIT,
  cursor?: string,
): Promise<ServiceAccountPage> {
  await requirePermission(principal, "service-accounts.manage");
  const position = cursor === undefined ? null : decodeCursor(LIST_CONTEXT, cursor);

  const rows = await database.serviceAccount.findMany({
    where: afterCursor(position),
    orderBy: [...CURSOR_ORDER],
    take: limit + 1,
    select: serviceAccountSelection,
  });

  return toPage(LIST_CONTEXT, rows, limit, toDto);
}

export async function getServiceAccount(
  principal: Principal,
  id: string,
): Promise<ServiceAccountDto> {
  await requirePermission(principal, "service-accounts.manage");
  return toDto(await findRow(id));
}

export async function createServiceAccount(
  actor: ActorContext,
  input: CreateServiceAccountRequest,
): Promise<ServiceAccountDto> {
  await requirePermission(actor.principal, "service-accounts.manage");
  const grants = await validatePermissionGrants(input.permissions);
  await requireDelegableGrants(actor.principal, grants);

  const id = randomUUID();
  await database.$transaction(async (transaction) => {
    await transaction.serviceAccount.create({
      data: {
        id,
        name: input.name,
        description: input.description ?? null,
        createdByUserId: actor.principal.type === "user" ? actor.principal.id : null,
        permissionGrants: {
          create: grants.map((grant) => ({
            id: randomUUID(),
            permission: grant.permission,
            scopeKey: grant.scopeKey,
            eventId: grant.eventId,
          })),
        },
      },
    });
    await recordAudit(
      {
        actor: actor.principal,
        action: "service-account.created",
        targetType: "service-account",
        targetId: id,
        result: "success",
        traceId: actor.traceId,
        metadata: { permissions: grants.map(({ permission, scopeKey }) => `${permission}@${scopeKey}`) },
      },
      transaction,
    );
  });

  return toDto(await findRow(id));
}

export async function updateServiceAccount(
  actor: ActorContext,
  id: string,
  input: UpdateServiceAccountRequest,
): Promise<ServiceAccountDto> {
  await requirePermission(actor.principal, "service-accounts.manage");
  const current = await findRow(id);
  if (current.version !== input.version) {
    throw versionConflictProblem(current.version);
  }

  const grants = await validatePermissionGrants(input.permissions);
  const existingGrants = new Set(
    current.permissionGrants.map(({ permission, scopeKey }) => `${permission}|${scopeKey}`),
  );
  await requireDelegableGrants(actor.principal, grants, existingGrants);

  await database.$transaction(async (transaction) => {
    // The version predicate makes the check-and-write atomic against concurrent updates.
    const updated = await transaction.serviceAccount.updateMany({
      where: { id, version: input.version },
      data: {
        name: input.name,
        description: input.description,
        status: input.status,
        version: { increment: 1 },
      },
    });
    if (updated.count !== 1) {
      const latest = await transaction.serviceAccount.findUnique({
        where: { id },
        select: { version: true },
      });
      throw latest === null ? notFoundProblem() : versionConflictProblem(latest.version);
    }

    await transaction.serviceAccountPermissionGrant.deleteMany({ where: { serviceAccountId: id } });
    await transaction.serviceAccountPermissionGrant.createMany({
      data: grants.map((grant) => ({
        id: randomUUID(),
        serviceAccountId: id,
        permission: grant.permission,
        scopeKey: grant.scopeKey,
        eventId: grant.eventId,
      })),
    });

    await recordAudit(
      {
        actor: actor.principal,
        action: "service-account.updated",
        targetType: "service-account",
        targetId: id,
        result: "success",
        traceId: actor.traceId,
        metadata: {
          previousStatus: current.status,
          status: input.status,
          permissions: grants.map(({ permission, scopeKey }) => `${permission}@${scopeKey}`),
        },
      },
      transaction,
    );
  });

  return toDto(await findRow(id));
}
