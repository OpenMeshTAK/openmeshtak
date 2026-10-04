import { APIError, createAuthMiddleware, getSessionFromCtx } from "better-auth/api";
import { recordAudit } from "../../shared/audit/audit.js";
import { database } from "../../shared/database/database.js";
import { sendSecurityNotice } from "./account-emails.js";

/** Better Auth endpoints that change a signed-in user's credentials, with their audit actions. */
const AUDITED_PATHS: Record<string, string> = {
  "/passkey/verify-registration": "passkey.registered",
  "/passkey/delete-passkey": "passkey.deleted",
  "/change-password": "password.changed",
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
 * Passkeys and passwords are credentials, so their changes are audited like every credential
 * change, and the account's verified address gets a notice. Better Auth owns these endpoints;
 * this after-hook records only successful changes with safe IDs, never a public key, WebAuthn
 * payload or password.
 */
export const credentialChangeHook = createAuthMiddleware(async (ctx) => {
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

  const isPasskey = action.startsWith("passkey.");
  await recordAudit({
    actor: { type: "user", id: domainUser.id, authSubjectId: session.user.id, sessionCreatedAt: session.session.createdAt },
    action,
    targetType: isPasskey ? "passkey" : "user",
    targetId: isPasskey ? passkeyIdFrom(ctx.context.returned, ctx.body) : domainUser.id,
    result: "success",
  });
  await sendSecurityNotice(session.user.id, action);
});
