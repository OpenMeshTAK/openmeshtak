import { randomUUID } from "node:crypto";
import { recordAudit } from "../../shared/audit/audit.js";
import {
  requirePermission,
  requireRecentAuthentication,
} from "../../shared/auth/permission-check.js";
import type { ActorContext, UserPrincipal } from "../../shared/auth/principal.js";
import { database } from "../../shared/database/database.js";
import { notFoundProblem, validationProblem } from "../../shared/errors/problem-error.js";
import {
  afterCursor,
  CURSOR_ORDER,
  DEFAULT_PAGE_LIMIT,
  decodeCursor,
  toPage,
} from "../../shared/pagination/cursor.js";
import { apiKeyDisplayPrefix, generateApiKey } from "./api-key-secret.js";
import type {
  ApiKeyDto,
  ApiKeyPage,
  ApiKeyStatus,
  CreateApiKeyRequest,
  CreatedApiKeyResponse,
} from "./service-account.dto.js";

const apiKeySelection = {
  id: true,
  serviceAccountId: true,
  name: true,
  publicKeyId: true,
  expiresAt: true,
  lastUsedAt: true,
  revokedAt: true,
  createdAt: true,
} as const;

interface ApiKeyRow {
  id: string;
  serviceAccountId: string;
  name: string;
  publicKeyId: string;
  expiresAt: Date | null;
  lastUsedAt: Date | null;
  revokedAt: Date | null;
  createdAt: Date;
}

function statusOf(row: ApiKeyRow, now: Date): ApiKeyStatus {
  if (row.revokedAt !== null) {
    return "revoked";
  }
  return row.expiresAt !== null && row.expiresAt <= now ? "expired" : "active";
}

function toDto(row: ApiKeyRow, now = new Date()): ApiKeyDto {
  return {
    id: row.id,
    serviceAccountId: row.serviceAccountId,
    name: row.name,
    displayPrefix: apiKeyDisplayPrefix(row.publicKeyId),
    status: statusOf(row, now),
    expiresAt: row.expiresAt?.toISOString() ?? null,
    lastUsedAt: row.lastUsedAt?.toISOString() ?? null,
    revokedAt: row.revokedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
  };
}

async function requireServiceAccount(id: string): Promise<void> {
  const account = await database.serviceAccount.findUnique({ where: { id }, select: { id: true } });
  if (account === null) {
    throw notFoundProblem();
  }
}

function parseExpiry(value: string | null | undefined, now: Date): Date | null {
  if (value === undefined || value === null) {
    return null;
  }

  const expiresAt = new Date(value);
  if (expiresAt <= now) {
    throw validationProblem([
      { field: "expiresAt", code: "NOT_IN_FUTURE", message: "The expiry must lie in the future." },
    ]);
  }
  return expiresAt;
}

export async function listApiKeys(
  actor: ActorContext,
  serviceAccountId: string,
  limit = DEFAULT_PAGE_LIMIT,
  cursor?: string,
): Promise<ApiKeyPage> {
  await requirePermission(actor.principal, "service-accounts.manage");
  await requireServiceAccount(serviceAccountId);

  const context = `service-accounts/${serviceAccountId}/api-keys`;
  const position = cursor === undefined ? null : decodeCursor(context, cursor);
  const rows = await database.apiKey.findMany({
    where: { serviceAccountId, ...afterCursor(position) },
    orderBy: [...CURSOR_ORDER],
    take: limit + 1,
    select: apiKeySelection,
  });

  const now = new Date();
  return toPage(context, rows, limit, (row) => toDto(row, now));
}

/**
 * Creating a second active key is how rotation works: callers switch to the new key, then the
 * old key is revoked. The plaintext is only ever present in this response.
 */
export async function createApiKey(
  actor: ActorContext & { principal: UserPrincipal },
  serviceAccountId: string,
  input: CreateApiKeyRequest,
): Promise<CreatedApiKeyResponse> {
  await requirePermission(actor.principal, "service-accounts.manage");
  requireRecentAuthentication(actor.principal);
  await requireServiceAccount(serviceAccountId);

  const now = new Date();
  const expiresAt = parseExpiry(input.expiresAt, now);
  const generated = generateApiKey();
  const id = randomUUID();

  const row = await database.$transaction(async (transaction) => {
    const otherActiveKeys = await transaction.apiKey.count({
      where: {
        serviceAccountId,
        revokedAt: null,
        OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
      },
    });

    const created = await transaction.apiKey.create({
      data: {
        id,
        serviceAccountId,
        name: input.name,
        publicKeyId: generated.publicKeyId,
        secretHash: generated.secretHash,
        expiresAt,
        createdByUserId: actor.principal.id,
      },
      select: apiKeySelection,
    });

    await recordAudit(
      {
        actor: actor.principal,
        action: otherActiveKeys > 0 ? "api-key.rotated" : "api-key.created",
        targetType: "api-key",
        targetId: id,
        result: "success",
        traceId: actor.traceId,
        metadata: { serviceAccountId, otherActiveKeys },
      },
      transaction,
    );

    return created;
  });

  return { apiKey: toDto(row, now), key: generated.plaintext };
}

/** Revocation is immediate and idempotent; repeating it returns the already revoked key. */
export async function revokeApiKey(
  actor: ActorContext,
  serviceAccountId: string,
  apiKeyId: string,
): Promise<ApiKeyDto> {
  await requirePermission(actor.principal, "service-accounts.manage");

  const existing = await database.apiKey.findFirst({
    where: { id: apiKeyId, serviceAccountId },
    select: apiKeySelection,
  });
  if (existing === null) {
    throw notFoundProblem();
  }
  if (existing.revokedAt !== null) {
    return toDto(existing);
  }

  const row = await database.$transaction(async (transaction) => {
    const revoked = await transaction.apiKey.update({
      where: { id: apiKeyId },
      data: { revokedAt: new Date() },
      select: apiKeySelection,
    });
    await recordAudit(
      {
        actor: actor.principal,
        action: "api-key.revoked",
        targetType: "api-key",
        targetId: apiKeyId,
        result: "success",
        traceId: actor.traceId,
        metadata: { serviceAccountId },
      },
      transaction,
    );
    return revoked;
  });

  return toDto(row);
}
