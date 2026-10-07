import { randomUUID } from "node:crypto";
import { recordAudit } from "../../shared/audit/audit.js";
import { database } from "../../shared/database/database.js";
import { ProblemError, validationProblem } from "../../shared/errors/problem-error.js";
import { auth } from "../auth/auth.js";
import { removeIncompleteAuthSubject } from "../auth/auth-subjects.js";
import { placeholderEmailFor } from "../auth/claim-session.plugin.js";
import { hashAccountInviteToken, isWellFormedToken, REGISTRATION_INVITE_PREFIX } from "../users/account-invites.js";
import { invalidUsernameProblem, isValidUsername, normalizeUsername, usernameTakenProblem } from "../users/usernames.js";
import type { RegisterRequest, RegisterResponse } from "./registration.dto.js";
import { registrationMode } from "./registration-settings.service.js";

function registrationClosed(): ProblemError {
  return new ProblemError({
    type: "urn:openmeshtak:problem:registration-closed",
    title: "Registration is closed",
    status: 403,
    detail: "This installation does not accept new accounts. Ask an administrator for an account.",
    code: "REGISTRATION_CLOSED",
  });
}

/** Malformed, unknown, expired, revoked and used invites all look identical to the caller. */
function invalidInvite(): ProblemError {
  return new ProblemError({
    type: "urn:openmeshtak:problem:invalid-invite",
    title: "Invite is not usable",
    status: 401,
    detail: "The invite link is invalid or no longer usable. Ask an administrator for a new one.",
    code: "INVALID_INVITE",
  });
}

async function findUsableInvite(token: string | undefined): Promise<string> {
  if (token === undefined || !isWellFormedToken(REGISTRATION_INVITE_PREFIX, token)) {
    throw invalidInvite();
  }
  const invite = await database.accountInvite.findFirst({
    where: { tokenHash: hashAccountInviteToken(token), userId: null, consumedAt: null, revokedAt: null, expiresAt: { gt: new Date() } },
    select: { id: true },
  });
  if (invite === null) {
    throw invalidInvite();
  }
  return invite.id;
}

async function checkUsername(username: string): Promise<string> {
  const normalized = normalizeUsername(username);
  if (!isValidUsername(normalized)) {
    throw invalidUsernameProblem();
  }
  if ((await database.user.findUnique({ where: { username: normalized }, select: { id: true } })) !== null) {
    throw usernameTakenProblem();
  }
  return normalized;
}

export interface RegistrationResult {
  response: RegisterResponse;
  responseHeaders: Headers;
}

/**
 * Creates an account for the caller when registration is open, or invite-only and a usable invite
 * is given. The account starts without any permissions; administrators add it to user groups or
 * events. Like participants, it has a placeholder email until the person confirms a real one.
 */
export async function register(input: RegisterRequest, traceId: string): Promise<RegistrationResult> {
  const mode = await registrationMode();
  if (mode === "closed") {
    throw registrationClosed();
  }
  const inviteId = mode === "invite" ? await findUsableInvite(input.inviteToken) : null;
  const displayName = input.displayName.trim();
  if (displayName === "") {
    throw validationProblem([{ field: "displayName", code: "REQUIRED", message: "Enter your name." }]);
  }
  const username = await checkUsername(input.username);

  const userId = randomUUID();
  const signUp = await auth.api.signUpEmail({
    body: { email: placeholderEmailFor(userId), name: displayName, username, password: input.password },
    returnHeaders: true,
  });
  const authSubjectId = signUp.response.user.id;
  try {
    await database.$transaction(async (transaction) => {
      if (inviteId !== null) {
        // The conditional update is the replay guard: of two sign-ups with one invite, one fails.
        const consumed = await transaction.accountInvite.updateMany({
          where: { id: inviteId, consumedAt: null, revokedAt: null, expiresAt: { gt: new Date() } },
          data: { consumedAt: new Date() },
        });
        if (consumed.count !== 1) {
          throw invalidInvite();
        }
      }
      await transaction.domainUser.create({ data: { id: userId, displayName, authSubjectId } });
      await recordAudit(
        {
          actor: { type: "user", id: userId },
          action: "user.registered",
          targetType: "user",
          targetId: userId,
          result: "success",
          traceId,
          metadata: { mode, ...(inviteId === null ? {} : { inviteId }) },
        },
        transaction,
      );
    });
  } catch (error: unknown) {
    await removeIncompleteAuthSubject(authSubjectId);
    throw error;
  }

  return { response: { user: { id: userId, displayName, username } }, responseHeaders: signUp.headers };
}
