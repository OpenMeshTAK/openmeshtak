import type { ServiceAccountPrincipal } from "../../shared/auth/principal.js";
import { recordAudit } from "../../shared/audit/audit.js";
import { database } from "../../shared/database/database.js";
import { logger } from "../../shared/logging/logger.js";
import { apiKeySecretMatches, parseApiKey } from "./api-key-secret.js";

/** Avoid a database write on every machine request while keeping the timestamp useful. */
const LAST_USED_UPDATE_INTERVAL_MS = 60_000;

function bearerValue(authorizationHeader: string | undefined): string | null {
  if (authorizationHeader === undefined) {
    return null;
  }

  const [scheme, value, ...rest] = authorizationHeader.split(" ");
  return scheme?.toLowerCase() === "bearer" && value !== undefined && rest.length === 0
    ? value
    : null;
}

async function recordFailure(apiKeyId: string, reason: string, traceId: string): Promise<void> {
  await recordAudit({
    actor: { type: "anonymous" },
    action: "api-key.authentication-failed",
    targetType: "api-key",
    targetId: apiKeyId,
    result: "failure",
    traceId,
    metadata: { reason },
  });
}

/**
 * Resolves only the service-account identity. Permissions and event scopes are loaded from the
 * account on every authorization check, so grant changes and revocation apply immediately.
 */
export async function authenticateApiKey(
  authorizationHeader: string | undefined,
  traceId: string,
): Promise<ServiceAccountPrincipal | null> {
  const value = bearerValue(authorizationHeader);
  const parsed = value === null ? null : parseApiKey(value);

  if (parsed === null) {
    return null;
  }

  const apiKey = await database.apiKey.findUnique({
    where: { publicKeyId: parsed.publicKeyId },
    select: {
      id: true,
      secretHash: true,
      expiresAt: true,
      revokedAt: true,
      lastUsedAt: true,
      serviceAccount: { select: { id: true, status: true } },
    },
  });

  if (apiKey === null) {
    logger.warn({ event: "api_key_unknown", traceId }, "Unknown API key presented");
    return null;
  }

  const now = new Date();
  const failureReason = !apiKeySecretMatches(parsed.secret, apiKey.secretHash)
    ? "secret-mismatch"
    : apiKey.revokedAt !== null
      ? "revoked"
      : apiKey.expiresAt !== null && apiKey.expiresAt <= now
        ? "expired"
        : apiKey.serviceAccount.status !== "active"
          ? "service-account-disabled"
          : null;

  if (failureReason !== null) {
    await recordFailure(apiKey.id, failureReason, traceId);
    return null;
  }

  if (
    apiKey.lastUsedAt === null ||
    now.getTime() - apiKey.lastUsedAt.getTime() > LAST_USED_UPDATE_INTERVAL_MS
  ) {
    await database.apiKey.update({ where: { id: apiKey.id }, data: { lastUsedAt: now } });
  }

  return {
    type: "service-account",
    id: apiKey.serviceAccount.id,
    apiKeyId: apiKey.id,
  };
}
