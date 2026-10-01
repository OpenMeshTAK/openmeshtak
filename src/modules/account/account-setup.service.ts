import { auth } from "../auth/auth.js";
import { recordAudit } from "../../shared/audit/audit.js";
import { requireRecentAuthentication } from "../../shared/auth/permission-check.js";
import type { ActorContext } from "../../shared/auth/principal.js";
import { database } from "../../shared/database/database.js";
import { ProblemError } from "../../shared/errors/problem-error.js";
import { requireUserPrincipal } from "../../shared/http/request-context.js";
import { invalidUsernameProblem, isValidUsername, normalizeUsername, usernameTakenProblem } from "../users/usernames.js";

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

export interface AccountSetupInput {
  newPassword: string;
  /** Replaces the username derived from the name, if given. */
  username?: string;
}

async function chooseUsername(authSubjectId: string, username: string | undefined): Promise<string | null> {
  if (username === undefined) {
    return null;
  }
  const normalized = normalizeUsername(username);
  if (!isValidUsername(normalized)) {
    throw invalidUsernameProblem();
  }
  const owner = await database.user.findUnique({ where: { username: normalized }, select: { id: true } });
  if (owner !== null && owner.id !== authSubjectId) {
    throw usernameTakenProblem();
  }
  return normalized;
}

/**
 * Completes an account that has no password yet, typically a participant who just signed in with
 * an access link: it may pick its username and sets the first password. Every account needs a
 * password for sign-in and the TAK login; passkeys are optional. Better Auth hashes the password;
 * only a fresh session may do this, and never for an account that already has a password.
 */
export async function completeAccountSetup(actor: ActorContext, input: AccountSetupInput): Promise<void> {
  const principal = requireUserPrincipal(actor.principal);
  requireRecentAuthentication(principal);

  const context = await auth.$context;
  const account = await context.internalAdapter.findCredentialAccount(principal.authSubjectId);
  if (account?.password) {
    throw passwordAlreadySet();
  }
  const username = await chooseUsername(principal.authSubjectId, input.username);
  const newPassword = input.newPassword;
  if (username !== null) {
    await database.user.update({ where: { id: principal.authSubjectId }, data: { username, displayUsername: username } });
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
    action: "account.setup-completed",
    targetType: "user",
    targetId: principal.id,
    result: "success",
    traceId: actor.traceId,
    metadata: { usernameChosen: username !== null },
  });
}
