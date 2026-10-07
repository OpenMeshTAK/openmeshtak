import { recordAudit } from "../../shared/audit/audit.js";
import { database } from "../../shared/database/database.js";
import { ProblemError } from "../../shared/errors/problem-error.js";
import { hasOwnSignIn, openLinkSession } from "../auth/auth-subjects.js";
import type { ClaimExchangeResponse } from "./member-claim.dto.js";
import { CLAIM_TOKEN_PREFIX, hashClaimToken } from "./member-claims.service.js";

const claimTokenPattern = /^omtk_claim_[A-Za-z0-9_-]{43}$/;

export interface ClaimExchangeResult {
  response: ClaimExchangeResponse;
  responseHeaders: Headers;
}

/** Malformed, unknown, expired, revoked and replayed claims all look identical to the caller. */
function invalidClaim(): ProblemError {
  return new ProblemError({
    type: "urn:openmeshtak:problem:invalid-claim",
    title: "Claim is not usable",
    status: 401,
    detail: "The claim link is invalid or no longer usable. Ask an organizer for a new one.",
    code: "INVALID_CLAIM",
  });
}

/** A claim only bootstraps accounts that cannot sign in yet; see `hasOwnSignIn`. */
function signInRequired(): ProblemError {
  return new ProblemError({
    type: "urn:openmeshtak:problem:sign-in-required",
    title: "Sign-in required",
    status: 403,
    detail: "This account has its own sign-in. Sign in with your password or passkey instead.",
    code: "SIGN_IN_REQUIRED",
  });
}

interface ConsumedClaim {
  claimId: string;
  eventId: string;
  userId: string;
  displayName: string;
  authSubjectId: string | null;
}

/**
 * Checks and consumes the claim in one transaction. The conditional update is the replay guard:
 * of two concurrent exchanges only one can move `consumedAt` from null.
 */
async function consumeClaim(token: string, traceId: string): Promise<ConsumedClaim> {
  const now = new Date();

  const outcome = await database.$transaction(async (transaction) => {
    const claim = await transaction.memberClaim.findUnique({
      where: { tokenHash: hashClaimToken(token) },
      select: {
        id: true,
        eventId: true,
        consumedAt: true,
        revokedAt: true,
        expiresAt: true,
        event: { select: { status: true } },
        member: { select: { user: { select: { id: true, displayName: true, authSubjectId: true, disabledAt: true } } } },
      },
    });
    if (claim === null) {
      return null;
    }
    // Checked before consuming, so the claim stays unused and grants nothing.
    if (await hasOwnSignIn(transaction, claim.member.user.authSubjectId)) {
      return { claim, consumed: false, signInRequired: true };
    }

    // A disabled account fails like any invalid claim; the session hook cannot catch the first
    // claim, whose Better Auth user does not exist yet.
    const usable =
      claim.member.user.disabledAt === null &&
      claim.consumedAt === null &&
      claim.revokedAt === null &&
      claim.expiresAt > now &&
      claim.event.status === "active";
    const consumed =
      usable &&
      (
        await transaction.memberClaim.updateMany({
          where: { id: claim.id, consumedAt: null, revokedAt: null },
          data: { consumedAt: now },
        })
      ).count === 1;

    return { claim, consumed, signInRequired: false };
  });

  if (outcome === null) {
    throw invalidClaim();
  }
  if (!outcome.consumed) {
    await recordAudit({
      actor: { type: "anonymous" },
      action: outcome.signInRequired ? "member-claim.sign-in-required" : "member-claim.exchange-failed",
      targetType: "member-claim",
      targetId: outcome.claim.id,
      result: "failure",
      traceId,
    });
    throw outcome.signInRequired ? signInRequired() : invalidClaim();
  }

  const { user } = outcome.claim.member;
  return {
    claimId: outcome.claim.id,
    eventId: outcome.claim.eventId,
    userId: user.id,
    displayName: user.displayName,
    authSubjectId: user.authSubjectId,
  };
}

/**
 * Exchanges a claim for a normal Better Auth browser session of the bound user. The claim never
 * changes user groups or event membership, and the session carries none of the issuer's rights.
 * A synchronized participant without local login receives an authentication subject here; members
 * who can already sign in must do so (SIGN_IN_REQUIRED).
 */
export async function exchangeClaim(token: string, traceId: string): Promise<ClaimExchangeResult> {
  if (!token.startsWith(CLAIM_TOKEN_PREFIX) || !claimTokenPattern.test(token)) {
    throw invalidClaim();
  }

  const claim = await consumeClaim(token, traceId);
  const responseHeaders = await openLinkSession(claim);

  await recordAudit({
    actor: { type: "system" },
    action: "member-claim.exchanged",
    targetType: "member-claim",
    targetId: claim.claimId,
    result: "success",
    traceId,
    metadata: { eventId: claim.eventId, userId: claim.userId },
  });

  return {
    response: {
      user: { id: claim.userId, displayName: claim.displayName },
      eventId: claim.eventId,
    },
    responseHeaders,
  };
}
