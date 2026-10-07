import { createHash, randomBytes, randomUUID } from "node:crypto";
import type { Prisma } from "../../generated/prisma/client.js";
import type { Principal } from "../../shared/auth/principal.js";

/** Setup links sign in one administrator-created user; registration invites allow one sign-up. */
export const SETUP_LINK_PREFIX = "omtk_setup_";
export const REGISTRATION_INVITE_PREFIX = "omtk_invite_";

/** Long enough to reach someone by email or messenger, short enough to limit a forgotten link. */
const ACCOUNT_INVITE_LIFETIME_MS = 7 * 24 * 60 * 60_000;

export type AccountInviteStatus = "open" | "consumed" | "revoked" | "expired";

/** Tokens are uniformly random, so a fast digest is sufficient for lookup and storage. */
export function hashAccountInviteToken(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

export function isWellFormedToken(prefix: string, token: string): boolean {
  return token.startsWith(prefix) && /^[A-Za-z0-9_-]{43}$/.test(token.slice(prefix.length));
}

export function accountInviteStatus(
  invite: { consumedAt: Date | null; revokedAt: Date | null; expiresAt: Date },
  now = new Date(),
): AccountInviteStatus {
  if (invite.consumedAt !== null) {
    return "consumed";
  }
  if (invite.revokedAt !== null) {
    return "revoked";
  }
  return invite.expiresAt <= now ? "expired" : "open";
}

export interface IssuedAccountInvite {
  id: string;
  token: string;
  expiresAt: Date;
  createdAt: Date;
}

/**
 * Stores a new single-use link and returns its token, which exists only in this response. A setup
 * link replaces any earlier open link of the same user, so at most one works at a time.
 */
export async function issueAccountInvite(
  transaction: Prisma.TransactionClient,
  issuer: Principal,
  userId: string | null,
): Promise<IssuedAccountInvite> {
  const now = new Date();
  const token = `${userId === null ? REGISTRATION_INVITE_PREFIX : SETUP_LINK_PREFIX}${randomBytes(32).toString("base64url")}`;
  if (userId !== null) {
    await transaction.accountInvite.updateMany({
      where: { userId, consumedAt: null, revokedAt: null },
      data: { revokedAt: now },
    });
  }
  const invite = await transaction.accountInvite.create({
    data: {
      id: randomUUID(),
      userId,
      tokenHash: hashAccountInviteToken(token),
      expiresAt: new Date(now.getTime() + ACCOUNT_INVITE_LIFETIME_MS),
      issuedByType: issuer.type,
      issuedById: issuer.id,
    },
  });
  return { id: invite.id, token, expiresAt: invite.expiresAt, createdAt: invite.createdAt };
}
