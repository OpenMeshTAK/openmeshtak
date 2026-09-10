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

type Transaction = Prisma.TransactionClient;

export interface ExternalMemberKey {
  provider: string;
  externalId: string;
}

interface Assignment {
  eventRoleId: string;
  eventGroupId: string;
}

/**
 * Integrations send OpenMeshTak slugs. A slug that does not exist in the event is reported as a
 * sync issue instead of guessing or falling back to an "unassigned" group.
 */
async function resolveAssignment(
  transaction: Transaction,
  eventId: string,
  request: ExternalMemberSyncRequest,
): Promise<Assignment | SyncIssueReason[]> {
  const [role, group] = await Promise.all([
    transaction.eventRole.findUnique({
      where: { eventId_slug: { eventId, slug: request.eventRole } },
      select: { id: true },
    }),
    transaction.eventGroup.findUnique({
      where: { eventId_slug: { eventId, slug: request.group } },
      select: { id: true },
    }),
  ]);

  if (role !== null && group !== null) {
    return { eventRoleId: role.id, eventGroupId: group.id };
  }

  const reasons: SyncIssueReason[] = [];
  if (role === null) {
    reasons.push({ field: "eventRole", code: "NOT_FOUND", message: "No event role uses this slug." });
  }
  if (group === null) {
    reasons.push({ field: "group", code: "NOT_FOUND", message: "No event group uses this slug." });
  }
  return reasons;
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
      metadata: { eventId, provider: key.provider, reasons: reasons.map(({ field }) => field) },
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

async function upsertMember(
  transaction: Transaction,
  actor: ActorContext,
  eventId: string,
  key: ExternalMemberKey,
  request: ExternalMemberSyncRequest,
  assignment: Assignment,
): Promise<ExternalMemberSyncResult> {
  const userId = await findOrCreateUser(transaction, key, request.username);
  const existing = await transaction.eventMember.findUnique({
    where: { eventId_userId: { eventId, userId } },
    select: { id: true, eventRoleId: true, eventGroupId: true },
  });

  let change: "created" | "updated" | "unchanged";
  let memberId: string;
  if (existing === null) {
    memberId = randomUUID();
    await transaction.eventMember.create({ data: { id: memberId, eventId, userId, ...assignment } });
    change = "created";
  } else if (
    existing.eventRoleId !== assignment.eventRoleId ||
    existing.eventGroupId !== assignment.eventGroupId
  ) {
    memberId = existing.id;
    await transaction.eventMember.update({
      where: { id: memberId },
      data: { ...assignment, version: { increment: 1 } },
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
): Promise<ExternalMemberSyncResult> {
  const run = (): Promise<ExternalMemberSyncResult> =>
    database.$transaction(async (transaction) => {
      const resolution = await resolveAssignment(transaction, eventId, request);
      return Array.isArray(resolution)
        ? recordSyncIssue(transaction, actor, eventId, key, request, resolution)
        : upsertMember(transaction, actor, eventId, key, request, resolution);
    });

  try {
    return await run();
  } catch (error: unknown) {
    // Two concurrent first syncs of the same identity race on the unique keys. The loser's
    // transaction rolled back completely; running it again finds the winner's records.
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
 * Re-evaluates the stored request of an open issue against the event's current roles and
 * groups, after an administrator fixed the mapping or created the missing slug.
 */
export async function retrySyncIssue(
  actor: ActorContext,
  eventId: string,
  syncIssueId: string,
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
  );
}
