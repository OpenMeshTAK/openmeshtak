import { APIError, createAuthMiddleware, getSessionFromCtx } from "better-auth/api";
import { recordAudit } from "../../shared/audit/audit.js";
import { database } from "../../shared/database/database.js";

/** Better Auth passkey endpoints that change a user's credentials, with their audit actions. */
const AUDITED_PATHS: Record<string, string> = {
  "/passkey/verify-registration": "passkey.registered",
  "/passkey/delete-passkey": "passkey.deleted",
};

function passkeyIdFrom(returned: unknown, body: unknown): string | null {
  for (const candidate of [returned, body]) {
    if (typeof candidate === "object" && candidate !== null && "id" in candidate && typeof candidate.id === "string") {
      return candidate.id;
    }
  }
  return null;
}

/**
 * Passkeys are credentials, so their registration and removal are audited (SECURITY.md). Better
 * Auth owns these endpoints; this after-hook records only successful changes with safe IDs and
 * never the public key or WebAuthn payload.
 */
export const passkeyAuditHook = createAuthMiddleware(async (ctx) => {
  const action = AUDITED_PATHS[ctx.path];
  if (action === undefined || ctx.context.returned instanceof APIError) {
    return;
  }

  const session = await getSessionFromCtx(ctx);
  if (session === null) {
    return;
  }
  const domainUser = await database.domainUser.findUnique({
    where: { authSubjectId: session.user.id },
    select: { id: true },
  });
  if (domainUser === null) {
    return;
  }

  await recordAudit({
    actor: { type: "user", id: domainUser.id, authSubjectId: session.user.id, sessionCreatedAt: session.session.createdAt },
    action,
    targetType: "passkey",
    targetId: passkeyIdFrom(ctx.context.returned, ctx.body),
    result: "success",
  });
});
