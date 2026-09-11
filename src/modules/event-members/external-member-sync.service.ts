import { randomUUID } from "node:crypto";
import type { Prisma } from "../../generated/prisma/client.js";
import { recordAudit } from "../../shared/audit/audit.js";
import type { ActorContext } from "../../shared/auth/principal.js";
import { database } from "../../shared/database/database.js";
import { isUniqueConstraintError } from "../../shared/database/unique-constraint.js";
import { notFoundProblem, ProblemError } from "../../shared/errors/problem-error.js";
import { eventArchivedProblem, requireEventPermission } from "../events/event-access.js";
import type {
  ExternalMemberSyncRequest,
  ExternalMemberSyncResult,
  SyncIssueReason,
} from "./event-member.dto.js";
import {
  eventMemberSelection,
  toEventMemberDto,
  toSyncIssueDto,
} from "./event-member.mapper.js";
import {
  callsignFits,
  nextShortNameNumber,
  renderCallsign,
  shortNameFits,
} from "./member-identity.js";

type Transaction = Prisma.TransactionClient;

export interface ExternalMemberKey {
  provider: string;
  externalId: string;
}

interface ExistingMember {
  id: string;
  userId: string;
  eventRoleId: string;
  eventGroupId: string;
  username: string;
  callsign: string;
  callsignOverride: string | null;
  shortNameNumber: number;
}

/** Everything needed to write the membership, computed before any write happens. */
interface Resolution {
  eventRoleId: string;
  eventGroupId: string;
  callsign: string;
  callsignOverride: string | null;
  shortNameNumber: number;
}

async function findExistingMember(
  transaction: Transaction,
  eventId: string,
  key: ExternalMemberKey,
): Promise<ExistingMember | null> {
  const identity = await transaction.externalIdentity.findUnique({
    where: { provider_externalId: key },
    select: { userId: true },
  });
  if (identity === null) {
    return null;
  }

  return transaction.eventMember.findUnique({
    where: { eventId_userId: { eventId, userId: identity.userId } },
    select: {
      id: true,
      userId: true,
      eventRoleId: true,
      eventGroupId: true,
      username: true,
      callsign: true,
      callsignOverride: true,
      shortNameNumber: true,
    },
  });
}

/**
 * Integrations send OpenMeshTak slugs. Unknown slugs, colliding or oversized callsigns and full
 * short-name ranges are reported as sync-issue reasons instead of being guessed or truncated.
 */
async function resolve(
  transaction: Transaction,
  eventId: string,
  request: ExternalMemberSyncRequest,
  existing: ExistingMember | null,
  requestedOverride: string | undefined,
): Promise<Resolution | SyncIssueReason[]> {
  const [role, group] = await Promise.all([
    transaction.eventRole.findUnique({
      where: { eventId_slug: { eventId, slug: request.eventRole } },
      select: { id: true },
    }),
    transaction.eventGroup.findUnique({
      where: { eventId_slug: { eventId, slug: request.group } },
      select: { id: true, name: true, callsignFormat: true, shortNamePrefix: true },
    }),
  ]);

  const reasons: SyncIssueReason[] = [];
  if (role === null) {
    reasons.push({ field: "eventRole", code: "NOT_FOUND", message: "No event role uses this slug." });
  }
  if (group === null) {
    reasons.push({ field: "group", code: "NOT_FOUND", message: "No event group uses this slug." });
  }
  if (role === null || group === null) {
    return reasons;
  }

  const callsignOverride = requestedOverride ?? existing?.callsignOverride ?? null;
  const callsign =
    callsignOverride ?? renderCallsign(group.callsignFormat, request.username, group.name);

  if (!callsignFits(callsign)) {
    reasons.push({
      field: "callsign",
      code: "TOO_LONG",
      message: "The callsign exceeds the 39-byte Meshtastic long-name limit.",
    });
  }
  const holder = await transaction.eventMember.findUnique({
    where: { eventId_callsign: { eventId, callsign } },
    select: { id: true },
  });
  if (holder !== null && holder.id !== existing?.id) {
    reasons.push({
      field: "callsign",
      code: "CONFLICT",
      message: "Another member of this event already uses this callsign.",
    });
  }

  let shortNameNumber = existing?.shortNameNumber ?? 0;
  if (existing?.eventGroupId !== group.id) {
    const used = await transaction.eventMember.findMany({
      where: { eventGroupId: group.id },
      select: { shortNameNumber: true },
    });
    shortNameNumber = nextShortNameNumber(used.map((member) => member.shortNameNumber));
  }
  if (!shortNameFits(group.shortNamePrefix, shortNameNumber)) {
    reasons.push({
      field: "shortName",
      code: "EXHAUSTED",
      message: "The group's short-name prefix leaves no free 4-byte short name.",
    });
  }

  return reasons.length > 0
    ? reasons
    : { eventRoleId: role.id, eventGroupId: group.id, callsign, callsignOverride, shortNameNumber };
}

async function recordSyncIssue(
  transaction: Transaction,
  actor: ActorContext,
  eventId: string,
  key: ExternalMemberKey,
  request: ExternalMemberSyncRequest,
  reasons: SyncIssueReason[],
): Promise<ExternalMemberSyncResult> {
  const details = {
    status: "open" as const,
    username: request.username,
    requestedRole: request.eventRole,
    requestedGroup: request.group,
    reasons: reasons as unknown as Prisma.InputJsonArray,
    resolvedAt: null,
  };
  const issue = await transaction.syncIssue.upsert({
    where: { eventId_provider_externalId: { eventId, ...key } },
    create: { id: randomUUID(), eventId, ...key, ...details },
    update: { ...details, occurrences: { increment: 1 } },
  });

  await recordAudit(
    {
      actor: actor.principal,
      action: "sync-issue.recorded",
      targetType: "sync-issue",
      targetId: issue.id,
      result: "failure",
      traceId: actor.traceId,
      metadata: { eventId, provider: key.provider, reasons: reasons.map(({ field, code }) => `${field}:${code}`) },
    },
    transaction,
  );

  return { outcome: "sync-issue", syncIssue: toSyncIssueDto(issue) };
}

/**
 * Finds the user behind an external identity or creates a plain domain user for it. This is the
 * only identity side effect of synchronization: no Better Auth user, credential, email address
 * or session is ever created here.
 */
async function findOrCreateUser(
  transaction: Transaction,
  key: ExternalMemberKey,
  username: string,
): Promise<string> {
  const identity = await transaction.externalIdentity.findUnique({
    where: { provider_externalId: key },
    select: { id: true, userId: true, username: true },
  });

  if (identity !== null) {
    if (identity.username !== username) {
      await transaction.externalIdentity.update({ where: { id: identity.id }, data: { username } });
    }
    return identity.userId;
  }

  const userId = randomUUID();
  await transaction.domainUser.create({ data: { id: userId, displayName: username } });
  await transaction.externalIdentity.create({
    data: { id: randomUUID(), ...key, username, userId },
  });
  return userId;
}

function memberChanged(existing: ExistingMember, username: string, resolution: Resolution): boolean {
  return (
    existing.eventRoleId !== resolution.eventRoleId ||
    existing.eventGroupId !== resolution.eventGroupId ||
    existing.username !== username ||
    existing.callsign !== resolution.callsign ||
    existing.callsignOverride !== resolution.callsignOverride ||
    existing.shortNameNumber !== resolution.shortNameNumber
  );
}

async function upsertMember(
  transaction: Transaction,
  actor: ActorContext,
  eventId: string,
  key: ExternalMemberKey,
  request: ExternalMemberSyncRequest,
  existing: ExistingMember | null,
  resolution: Resolution,
): Promise<ExternalMemberSyncResult> {
  const userId = await findOrCreateUser(transaction, key, request.username);
  const data = { username: request.username, ...resolution };

  let change: "created" | "updated" | "unchanged";
  let memberId: string;
  if (existing === null) {
    memberId = randomUUID();
    await transaction.eventMember.create({ data: { id: memberId, eventId, userId, ...data } });
    change = "created";
  } else if (memberChanged(existing, request.username, resolution)) {
    memberId = existing.id;
    await transaction.eventMember.update({
      where: { id: memberId },
      data: { ...data, version: { increment: 1 } },
    });
    change = "updated";
  } else {
    memberId = existing.id;
    change = "unchanged";
  }

  const resolvedIssue = await transaction.syncIssue.updateMany({
    where: { eventId, ...key, status: "open" },
    data: { status: "resolved", resolvedAt: new Date() },
  });

  if (change !== "unchanged" || resolvedIssue.count > 0) {
    await recordAudit(
      {
        actor: actor.principal,
        action: `event-member.${change === "unchanged" ? "confirmed" : change}`,
        targetType: "event-member",
        targetId: memberId,
        result: "success",
        traceId: actor.traceId,
        metadata: {
          eventId,
          provider: key.provider,
          eventRole: request.eventRole,
          group: request.group,
          resolvedSyncIssue: resolvedIssue.count > 0,
        },
      },
      transaction,
    );
  }

  const member = await transaction.eventMember.findUniqueOrThrow({
    where: { id: memberId },
    select: eventMemberSelection,
  });
  return { outcome: "member", change, member: toEventMemberDto(member) };
}

async function applySync(
  actor: ActorContext,
  eventId: string,
  key: ExternalMemberKey,
  request: ExternalMemberSyncRequest,
  callsignOverride?: string,
): Promise<ExternalMemberSyncResult> {
  const run = (): Promise<ExternalMemberSyncResult> =>
    database.$transaction(async (transaction) => {
      const existing = await findExistingMember(transaction, eventId, key);
      const resolution = await resolve(transaction, eventId, request, existing, callsignOverride);
      return Array.isArray(resolution)
        ? recordSyncIssue(transaction, actor, eventId, key, request, resolution)
        : upsertMember(transaction, actor, eventId, key, request, existing, resolution);
    });

  try {
    return await run();
  } catch (error: unknown) {
    // Concurrent syncs race on unique keys (identity, callsign, short-name number). The loser's
    // transaction rolled back completely; running it again sees the winner's records.
    if (isUniqueConstraintError(error)) {
      return run();
    }
    throw error;
  }
}

/** Idempotent upsert keyed by `provider + externalId`. Archived events reject synchronization. */
export async function syncExternalMember(
  actor: ActorContext,
  eventId: string,
  key: ExternalMemberKey,
  request: ExternalMemberSyncRequest,
): Promise<ExternalMemberSyncResult> {
  const event = await requireEventPermission(actor.principal, eventId, "members.sync");
  if (event.status === "archived") {
    throw eventArchivedProblem();
  }
  return applySync(actor, eventId, key, request);
}

/**
 * Re-evaluates the stored request of an open issue against the event's current roles and groups.
 * An administrator may pass a callsign override to resolve a callsign conflict.
 */
export async function retrySyncIssue(
  actor: ActorContext,
  eventId: string,
  syncIssueId: string,
  callsignOverride?: string,
): Promise<ExternalMemberSyncResult> {
  const event = await requireEventPermission(actor.principal, eventId, "members.manage");
  if (event.status === "archived") {
    throw eventArchivedProblem();
  }

  const issue = await database.syncIssue.findFirst({ where: { id: syncIssueId, eventId } });
  if (issue === null) {
    throw notFoundProblem();
  }
  if (issue.status !== "open") {
    throw new ProblemError({
      type: "urn:openmeshtak:problem:sync-issue-not-open",
      title: "Sync issue is not open",
      status: 409,
      detail: "Only open sync issues can be retried.",
      code: "SYNC_ISSUE_NOT_OPEN",
    });
  }

  return applySync(
    actor,
    eventId,
    { provider: issue.provider, externalId: issue.externalId },
    { username: issue.username, eventRole: issue.requestedRole, group: issue.requestedGroup },
    callsignOverride,
  );
}
