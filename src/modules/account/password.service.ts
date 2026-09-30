import { auth } from "../auth/auth.js";
import { recordAudit } from "../../shared/audit/audit.js";
import { requireRecentAuthentication } from "../../shared/auth/permission-check.js";
import type { ActorContext } from "../../shared/auth/principal.js";
import { database } from "../../shared/database/database.js";
import { ProblemError } from "../../shared/errors/problem-error.js";
import { requireUserPrincipal } from "../../shared/http/request-context.js";

function passwordAlreadySet(): ProblemError {
  return new ProblemError({
    type: "urn:openmeshtak:problem:password-already-set",
    title: "Password already set",
    status: 409,
    detail: "This account already has a password. Change it with the current password instead.",
    code: "PASSWORD_ALREADY_SET",
  });
}

/** Whether the account can sign in with a password, and therefore log in to TAK apps. */
export async function hasPassword(authSubjectId: string): Promise<boolean> {
  const account = await database.account.findFirst({
    where: { userId: authSubjectId, providerId: "credential", password: { not: null } },
    select: { id: true },
  });
  return account !== null;
}

/**
 * Sets the first password of an account that has none, typically a participant who signed in
 * with an access link. Every account needs a password for the TAK login; passkeys are optional.
 * The hash comes from Better Auth, which owns passwords; only a fresh session may do this.
 */
export async function setFirstPassword(actor: ActorContext, newPassword: string): Promise<void> {
  const principal = requireUserPrincipal(actor.principal);
  requireRecentAuthentication(principal);

  const context = await auth.$context;
  const account = await context.internalAdapter.findCredentialAccount(principal.authSubjectId);
  if (account?.password) {
    throw passwordAlreadySet();
  }

  const passwordHash = await context.password.hash(newPassword);
  if (account === null) {
    await context.internalAdapter.linkAccount({
      userId: principal.authSubjectId,
      providerId: "credential",
      accountId: principal.authSubjectId,
      password: passwordHash,
    });
  } else {
    await context.internalAdapter.updateAccount(account.id, { password: passwordHash });
  }

  await recordAudit({
    actor: principal,
    action: "password.set",
    targetType: "user",
    targetId: principal.id,
    result: "success",
    traceId: actor.traceId,
  });
}
