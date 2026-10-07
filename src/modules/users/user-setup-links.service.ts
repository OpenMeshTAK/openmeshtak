import { randomUUID } from "node:crypto";
import type { Prisma } from "../../generated/prisma/client.js";
import { recordAudit } from "../../shared/audit/audit.js";
import { requirePermission } from "../../shared/auth/permission-check.js";
import type { ActorContext } from "../../shared/auth/principal.js";
import { config } from "../../shared/config/config.js";
import { database } from "../../shared/database/database.js";
import { isUniqueConstraintError } from "../../shared/database/unique-constraint.js";
import { notFoundProblem, ProblemError, validationProblem } from "../../shared/errors/problem-error.js";
import { auth } from "../auth/auth.js";
import { hasOwnSignIn, openLinkSession, removeIncompleteAuthSubject } from "../auth/auth-subjects.js";
import { placeholderEmailFor } from "../auth/claim-session.plugin.js";
import {
  hashAccountInviteToken,
  isWellFormedToken,
  issueAccountInvite,
  SETUP_LINK_PREFIX,
  type IssuedAccountInvite,
} from "./account-invites.js";
import type { CreatedUserResponse, CreateUserRequest, SetupLinkDto, SetupLinkExchangeResponse } from "./user.dto.js";
import { toUserDto, userSelection } from "./users.service.js";
import {
  availableUsernameFor,
  invalidUsernameProblem,
  isValidUsername,
  normalizeUsername,
  usernameTakenProblem,
} from "./usernames.js";

function toSetupLinkDto(link: IssuedAccountInvite): SetupLinkDto {
  return { url: `${config.publicOrigin}/activate#${link.token}`, expiresAt: link.expiresAt.toISOString() };
}

async function chooseUsername(displayName: string, username: string | undefined): Promise<string> {
  const chosen = username === undefined ? await availableUsernameFor(displayName) : normalizeUsername(username);
  if (!isValidUsername(chosen)) {
    throw invalidUsernameProblem();
  }
  if ((await database.user.findUnique({ where: { username: chosen }, select: { id: true } })) !== null) {
    throw usernameTakenProblem();
  }
  return chosen;
}

function auditEntry(actor: ActorContext, action: string, userId: string) {
  return {
    actor: actor.principal,
    action,
    targetType: "user",
    targetId: userId,
    result: "success" as const,
    traceId: actor.traceId,
  };
}

/**
 * Creates a user without a password and returns a single-use setup link for them. Opening the
 * link signs the person in once; they then set their own password, so administrators never know
 * it. The user has no permissions until added to a user group or an event. Requires `users.create`.
 */
export async function createUser(actor: ActorContext, input: CreateUserRequest): Promise<CreatedUserResponse> {
  await requirePermission(actor.principal, "users.create");
  const { response } = await createAccountWithSetupLink(actor, input, null, () => Promise.resolve(null));
  return response;
}

/**
 * Creates the login and domain user, then runs `alongside` in the same transaction, for example to
 * add the new account to an event. Callers check permissions first.
 * @param accountEventId Event whose archiving deletes the account; `null` for a permanent account.
 */
export async function createAccountWithSetupLink<T>(
  actor: ActorContext,
  input: CreateUserRequest,
  accountEventId: string | null,
  alongside: (transaction: Prisma.TransactionClient, user: { id: string; displayName: string }) => Promise<T>,
): Promise<{ response: CreatedUserResponse; result: T }> {
  const displayName = input.displayName.trim();
  if (displayName === "") {
    throw validationProblem([{ field: "displayName", code: "REQUIRED", message: "Enter a name." }]);
  }
  const username = await chooseUsername(displayName, input.username);

  const userId = randomUUID();
  const context = await auth.$context;
  const subject = await context.internalAdapter.createUser(
    { email: placeholderEmailFor(userId), name: displayName, emailVerified: false },
    { method: "openmeshtak-admin" },
  );
  try {
    await database.user.update({ where: { id: subject.id }, data: { username, displayUsername: username } });
    const { link, result } = await database.$transaction(async (transaction) => {
      await transaction.domainUser.create({ data: { id: userId, displayName, authSubjectId: subject.id, accountEventId } });
      const issued = await issueAccountInvite(transaction, actor.principal, userId);
      await recordAudit(
        { ...auditEntry(actor, "user.created", userId), metadata: accountEventId === null ? {} : { accountEventId } },
        transaction,
      );
      return { link: issued, result: await alongside(transaction, { id: userId, displayName }) };
    });
    const user = await database.domainUser.findUniqueOrThrow({ where: { id: userId }, select: userSelection });
    return { response: { user: toUserDto(user), setupLink: toSetupLinkDto(link) }, result };
  } catch (error: unknown) {
    await removeIncompleteAuthSubject(subject.id);
    throw isUniqueConstraintError(error) ? usernameTakenProblem() : error;
  }
}

function alreadySetUp(): ProblemError {
  return new ProblemError({
    type: "urn:openmeshtak:problem:account-already-set-up",
    title: "Account already set up",
    status: 409,
    detail: "This user can already sign in. Send a password reset instead.",
    code: "ACCOUNT_ALREADY_SET_UP",
  });
}

/**
 * Issues a new setup link for a user who cannot sign in yet, for example after the first one
 * expired. Earlier open links of the user stop working. Requires `users.setup-links`.
 */
export async function createSetupLink(actor: ActorContext, userId: string): Promise<SetupLinkDto> {
  await requirePermission(actor.principal, "users.setup-links");
  const user = await database.domainUser.findUnique({ where: { id: userId }, select: { authSubjectId: true } });
  if (user === null) {
    throw notFoundProblem();
  }
  if (await hasOwnSignIn(database, user.authSubjectId)) {
    throw alreadySetUp();
  }
  const link = await database.$transaction(async (transaction) => {
    const issued = await issueAccountInvite(transaction, actor.principal, userId);
    await recordAudit(auditEntry(actor, "user.setup-link-created", userId), transaction);
    return issued;
  });
  return toSetupLinkDto(link);
}

/** Malformed, unknown, expired, revoked and replayed links all look identical to the caller. */
function invalidSetupLink(): ProblemError {
  return new ProblemError({
    type: "urn:openmeshtak:problem:invalid-setup-link",
    title: "Setup link is not usable",
    status: 401,
    detail: "The setup link is invalid or no longer usable. Ask an administrator for a new one.",
    code: "INVALID_SETUP_LINK",
  });
}

interface ConsumedLink {
  linkId: string;
  userId: string;
  displayName: string;
  authSubjectId: string | null;
}

/**
 * Checks and consumes the link in one transaction; the conditional update is the replay guard.
 * Accounts that can already sign in are refused, like access links.
 */
async function consumeSetupLink(transaction: Prisma.TransactionClient, token: string, now: Date): Promise<ConsumedLink | null> {
  const link = await transaction.accountInvite.findUnique({
    where: { tokenHash: hashAccountInviteToken(token) },
    select: {
      id: true,
      consumedAt: true,
      revokedAt: true,
      expiresAt: true,
      user: { select: { id: true, displayName: true, authSubjectId: true, disabledAt: true } },
    },
  });
  if (link?.user == null || (await hasOwnSignIn(transaction, link.user.authSubjectId))) {
    return null;
  }
  const usable = link.user.disabledAt === null && link.consumedAt === null && link.revokedAt === null && link.expiresAt > now;
  const consumed =
    usable &&
    (
      await transaction.accountInvite.updateMany({
        where: { id: link.id, consumedAt: null, revokedAt: null },
        data: { consumedAt: now },
      })
    ).count === 1;
  return consumed
    ? { linkId: link.id, userId: link.user.id, displayName: link.user.displayName, authSubjectId: link.user.authSubjectId }
    : null;
}

export interface SetupLinkExchangeResult {
  response: SetupLinkExchangeResponse;
  responseHeaders: Headers;
}

/** Exchanges a setup link for a browser session; the Web app then asks for the first password. */
export async function exchangeSetupLink(token: string, traceId: string): Promise<SetupLinkExchangeResult> {
  if (!isWellFormedToken(SETUP_LINK_PREFIX, token)) {
    throw invalidSetupLink();
  }
  const link = await database.$transaction((transaction) => consumeSetupLink(transaction, token, new Date()));
  if (link === null) {
    await recordAudit({
      actor: { type: "anonymous" },
      action: "user.setup-link-exchange-failed",
      targetType: "user",
      targetId: null,
      result: "failure",
      traceId,
    });
    throw invalidSetupLink();
  }

  const responseHeaders = await openLinkSession(link);
  await recordAudit({
    actor: { type: "system" },
    action: "user.setup-link-exchanged",
    targetType: "user",
    targetId: link.userId,
    result: "success",
    traceId,
    metadata: { setupLinkId: link.linkId },
  });
  return { response: { user: { id: link.userId, displayName: link.displayName } }, responseHeaders };
}
