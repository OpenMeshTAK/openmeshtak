import type { AccountInvite } from "../../generated/prisma/client.js";
import { recordAudit } from "../../shared/audit/audit.js";
import { requirePermission } from "../../shared/auth/permission-check.js";
import type { ActorContext, Principal } from "../../shared/auth/principal.js";
import { config } from "../../shared/config/config.js";
import { database } from "../../shared/database/database.js";
import { notFoundProblem } from "../../shared/errors/problem-error.js";
import { accountInviteStatus, issueAccountInvite } from "../users/account-invites.js";
import type { CreatedRegistrationInviteResponse, RegistrationInviteDto } from "./registration.dto.js";

const LISTED_INVITES = 50;

function toDto(invite: AccountInvite, now = new Date()): RegistrationInviteDto {
  return {
    id: invite.id,
    status: accountInviteStatus(invite, now),
    expiresAt: invite.expiresAt.toISOString(),
    consumedAt: invite.consumedAt?.toISOString() ?? null,
    revokedAt: invite.revokedAt?.toISOString() ?? null,
    createdAt: invite.createdAt.toISOString(),
  };
}

function auditEntry(actor: ActorContext, action: string, inviteId: string) {
  return {
    actor: actor.principal,
    action,
    targetType: "registration-invite",
    targetId: inviteId,
    result: "success" as const,
    traceId: actor.traceId,
  };
}

/** The most recent registration invites, newest first. Requires `registration.manage`. */
export async function listRegistrationInvites(principal: Principal): Promise<RegistrationInviteDto[]> {
  await requirePermission(principal, "registration.manage");
  const invites = await database.accountInvite.findMany({
    where: { userId: null },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: LISTED_INVITES,
  });
  const now = new Date();
  return invites.map((invite) => toDto(invite, now));
}

/** Issues a single-use registration invite, valid for seven days. Requires `registration.manage`. */
export async function createRegistrationInvite(actor: ActorContext): Promise<CreatedRegistrationInviteResponse> {
  await requirePermission(actor.principal, "registration.manage");
  const issued = await database.$transaction(async (transaction) => {
    const invite = await issueAccountInvite(transaction, actor.principal, null);
    await recordAudit(auditEntry(actor, "registration-invite.created", invite.id), transaction);
    return invite;
  });
  const invite = await database.accountInvite.findUniqueOrThrow({ where: { id: issued.id } });
  return { invite: toDto(invite), inviteUrl: `${config.publicOrigin}/register#${issued.token}` };
}

/** Revocation is immediate and idempotent. Requires `registration.manage`. */
export async function revokeRegistrationInvite(actor: ActorContext, inviteId: string): Promise<RegistrationInviteDto> {
  await requirePermission(actor.principal, "registration.manage");
  const invite = await database.accountInvite.findFirst({ where: { id: inviteId, userId: null } });
  if (invite === null) {
    throw notFoundProblem();
  }
  if (invite.consumedAt !== null || invite.revokedAt !== null) {
    return toDto(invite);
  }
  const revoked = await database.$transaction(async (transaction) => {
    const updated = await transaction.accountInvite.update({ where: { id: inviteId }, data: { revokedAt: new Date() } });
    await recordAudit(auditEntry(actor, "registration-invite.revoked", inviteId), transaction);
    return updated;
  });
  return toDto(revoked);
}
