import { createHash, randomBytes, randomUUID } from "node:crypto";
import type { MemberClaim } from "../../generated/prisma/client.js";
import { recordAudit } from "../../shared/audit/audit.js";
import type { ActorContext, Principal } from "../../shared/auth/principal.js";
import { config } from "../../shared/config/config.js";
import { database } from "../../shared/database/database.js";
import { notFoundProblem, ProblemError } from "../../shared/errors/problem-error.js";
import { requireEventPermission } from "../events/event-access.js";
import type {
  CreatedMemberClaimResponse,
  MemberClaimDto,
  MemberClaimStatus,
} from "./member-claim.dto.js";

export const CLAIM_TOKEN_PREFIX = "omtk_claim_";
const CLAIM_LIFETIME_MS = 24 * 60 * 60_000;

/** Claim tokens are uniformly random, so a fast digest is sufficient for lookup and storage. */
export function hashClaimToken(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

function statusOf(claim: MemberClaim, now: Date): MemberClaimStatus {
  if (claim.consumedAt !== null) {
    return "consumed";
  }
  if (claim.revokedAt !== null) {
    return "revoked";
  }
  return claim.expiresAt <= now ? "expired" : "open";
}

function toDto(claim: MemberClaim, now = new Date()): MemberClaimDto {
  return {
    id: claim.id,
    eventId: claim.eventId,
    memberId: claim.memberId,
    status: statusOf(claim, now),
    expiresAt: claim.expiresAt.toISOString(),
    consumedAt: claim.consumedAt?.toISOString() ?? null,
    revokedAt: claim.revokedAt?.toISOString() ?? null,
    createdAt: claim.createdAt.toISOString(),
  };
}

function eventNotActive(): ProblemError {
  return new ProblemError({
    type: "urn:openmeshtak:problem:event-not-active",
    title: "Event is not active",
    status: 409,
    detail: "Participants can only claim access to active events.",
    code: "EVENT_NOT_ACTIVE",
  });
}

async function requireMember(eventId: string, memberId: string): Promise<void> {
  const member = await database.eventMember.findFirst({
    where: { id: memberId, eventId },
    select: { id: true },
  });
  if (member === null) {
    throw notFoundProblem();
  }
}

export async function listMemberClaims(
  principal: Principal,
  eventId: string,
  memberId: string,
): Promise<MemberClaimDto[]> {
  await requireEventPermission(principal, eventId, "members.read");
  await requireMember(eventId, memberId);

  const claims = await database.memberClaim.findMany({
    where: { eventId, memberId },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: 20,
  });
  const now = new Date();
  return claims.map((claim) => toDto(claim, now));
}

/**
 * Issues a new single-use claim and revokes any earlier open claim for the member, so at most one
 * claim link is usable at a time. Only active events accept claims.
 */
export async function createMemberClaim(
  actor: ActorContext,
  eventId: string,
  memberId: string,
): Promise<CreatedMemberClaimResponse> {
  const event = await requireEventPermission(actor.principal, eventId, "member-claims.create");
  if (event.status !== "active") {
    throw eventNotActive();
  }
  await requireMember(eventId, memberId);

  const token = `${CLAIM_TOKEN_PREFIX}${randomBytes(32).toString("base64url")}`;
  const now = new Date();

  const claim = await database.$transaction(async (transaction) => {
    const replaced = await transaction.memberClaim.updateMany({
      where: { memberId, consumedAt: null, revokedAt: null },
      data: { revokedAt: now },
    });
    const created = await transaction.memberClaim.create({
      data: {
        id: randomUUID(),
        eventId,
        memberId,
        tokenHash: hashClaimToken(token),
        expiresAt: new Date(now.getTime() + CLAIM_LIFETIME_MS),
        issuedByType: actor.principal.type,
        issuedById: actor.principal.id,
      },
    });
    await recordAudit(
      {
        actor: actor.principal,
        action: "member-claim.created",
        targetType: "member-claim",
        targetId: created.id,
        result: "success",
        traceId: actor.traceId,
        metadata: { eventId, memberId, replacedClaims: replaced.count },
      },
      transaction,
    );
    return created;
  });

  return {
    claim: toDto(claim, now),
    token,
    claimUrl: `${config.publicOrigin}/claim#${token}`,
  };
}

/** Revocation is immediate and idempotent. Consumed claims are already unusable. */
export async function revokeMemberClaim(
  actor: ActorContext,
  eventId: string,
  memberId: string,
  claimId: string,
): Promise<MemberClaimDto> {
  await requireEventPermission(actor.principal, eventId, "member-claims.create");

  const claim = await database.memberClaim.findFirst({ where: { id: claimId, eventId, memberId } });
  if (claim === null) {
    throw notFoundProblem();
  }
  if (claim.consumedAt !== null || claim.revokedAt !== null) {
    return toDto(claim);
  }

  const revoked = await database.$transaction(async (transaction) => {
    const updated = await transaction.memberClaim.update({
      where: { id: claimId },
      data: { revokedAt: new Date() },
    });
    await recordAudit(
      {
        actor: actor.principal,
        action: "member-claim.revoked",
        targetType: "member-claim",
        targetId: claimId,
        result: "success",
        traceId: actor.traceId,
        metadata: { eventId, memberId },
      },
      transaction,
    );
    return updated;
  });
  return toDto(revoked);
}
