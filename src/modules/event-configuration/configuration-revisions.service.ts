import { randomUUID } from "node:crypto";
import type { EventConfigurationRevision, Prisma } from "../../generated/prisma/client.js";
import { recordAudit } from "../../shared/audit/audit.js";
import { requirePermission } from "../../shared/auth/permission-check.js";
import type { ActorContext, Principal } from "../../shared/auth/principal.js";
import { database } from "../../shared/database/database.js";
import { notFoundProblem, ProblemError } from "../../shared/errors/problem-error.js";
import {
  afterCursor,
  CURSOR_ORDER,
  DEFAULT_PAGE_LIMIT,
  decodeCursor,
  toPage,
} from "../../shared/pagination/cursor.js";
import { requireReadableEvent } from "../events/event-access.js";
import { activationProblems, notReady } from "../events/event-readiness.js";
import type {
  ConfigurationRevisionDto,
  ConfigurationRevisionPage,
  ConfigurationRevisionReason,
  ConfigurationRevisionSummaryDto,
  PendingConfigurationChangesDto,
  PublishConfigurationResponse,
} from "./configuration-revision.dto.js";
import { diffConfigurationSnapshots } from "./configuration-changes.js";
import {
  buildConfigurationSnapshot,
  hashConfigurationSnapshot,
  parseConfigurationSnapshot,
} from "./configuration-snapshot.js";

function toSummary(row: EventConfigurationRevision): ConfigurationRevisionSummaryDto {
  return {
    id: row.id,
    eventId: row.eventId,
    number: row.number,
    reason: row.reason as ConfigurationRevisionReason,
    createdAt: row.createdAt.toISOString(),
  };
}

function toDto(row: EventConfigurationRevision): ConfigurationRevisionDto {
  return { ...toSummary(row), snapshot: parseConfigurationSnapshot(row.snapshot) };
}

export async function latestConfigurationRevision(
  client: Pick<Prisma.TransactionClient, "eventConfigurationRevision">,
  eventId: string,
): Promise<EventConfigurationRevision | null> {
  return client.eventConfigurationRevision.findFirst({
    where: { eventId },
    orderBy: { number: "desc" },
  });
}

/**
 * Creates a revision from the current configuration inside the caller's transaction. With
 * `skipIfUnchanged`, an identical latest revision is returned instead of a duplicate.
 */
export async function createConfigurationRevision(
  transaction: Prisma.TransactionClient,
  actor: ActorContext,
  eventId: string,
  reason: ConfigurationRevisionReason,
  options: { skipIfUnchanged?: boolean } = {},
): Promise<{ created: boolean; revision: EventConfigurationRevision }> {
  const snapshot = await buildConfigurationSnapshot(transaction, eventId);
  const snapshotHash = hashConfigurationSnapshot(snapshot);
  const latest = await latestConfigurationRevision(transaction, eventId);

  if (options.skipIfUnchanged === true && latest?.snapshotHash === snapshotHash) {
    return { created: false, revision: latest };
  }

  const revision = await transaction.eventConfigurationRevision.create({
    data: {
      id: randomUUID(),
      eventId,
      number: (latest?.number ?? 0) + 1,
      reason,
      snapshot: snapshot as unknown as Prisma.InputJsonObject,
      snapshotHash,
      createdByType: actor.principal.type,
      createdById: actor.principal.id,
    },
  });
  await recordAudit(
    {
      actor: actor.principal,
      action: "event-configuration.revision-created",
      targetType: "event-configuration-revision",
      targetId: revision.id,
      result: "success",
      traceId: actor.traceId,
      metadata: { eventId, number: revision.number, reason },
    },
    transaction,
  );
  return { created: true, revision };
}

/** Publishes the current configuration of an active event for profiles and artifacts. */
export async function publishConfiguration(
  actor: ActorContext,
  eventId: string,
): Promise<PublishConfigurationResponse> {
  const event = await requireReadableEvent(actor.principal, eventId);
  await requirePermission(actor.principal, "events.manage", eventId);
  if (event.status !== "active") {
    throw new ProblemError({
      type: "urn:openmeshtak:problem:event-not-active",
      title: "Event is not active",
      status: 409,
      detail: "Only active events publish configuration revisions; activation creates the first one.",
      code: "EVENT_NOT_ACTIVE",
    });
  }

  const problems = await activationProblems(event);
  if (problems.length > 0) {
    throw notReady(problems);
  }

  const result = await database.$transaction((transaction) =>
    createConfigurationRevision(transaction, actor, eventId, "publish", { skipIfUnchanged: true }),
  );
  return { created: result.created, revision: toDto(result.revision) };
}

/** Compares the current configuration with the published revision, as publishing would. */
export async function pendingConfigurationChanges(
  principal: Principal,
  eventId: string,
): Promise<PendingConfigurationChangesDto> {
  const event = await requireReadableEvent(principal, eventId);
  const latest = await latestConfigurationRevision(database, eventId);
  if (latest === null || event.status !== "active") {
    return { publishedRevision: latest?.number ?? null, changes: [] };
  }
  const current = await buildConfigurationSnapshot(database, eventId);
  if (hashConfigurationSnapshot(current) === latest.snapshotHash) {
    return { publishedRevision: latest.number, changes: [] };
  }
  const changes = diffConfigurationSnapshots(parseConfigurationSnapshot(latest.snapshot), current);
  // An older snapshot format hashes differently even when nothing an administrator set changed.
  return {
    publishedRevision: latest.number,
    changes: changes.length > 0 ? changes : [{ area: "event", kind: "changed", name: "Configuration format update", fields: [] }],
  };
}

export async function listConfigurationRevisions(
  principal: Principal,
  eventId: string,
  limit = DEFAULT_PAGE_LIMIT,
  cursor?: string,
): Promise<ConfigurationRevisionPage> {
  await requireReadableEvent(principal, eventId);
  const context = `events/${eventId}/configuration-revisions`;
  const position = cursor === undefined ? null : decodeCursor(context, cursor);

  const rows = await database.eventConfigurationRevision.findMany({
    where: { eventId, ...afterCursor(position) },
    orderBy: [...CURSOR_ORDER],
    take: limit + 1,
  });
  return toPage(context, rows, limit, toSummary);
}

export async function getConfigurationRevision(
  principal: Principal,
  eventId: string,
  revisionId: string,
): Promise<ConfigurationRevisionDto> {
  await requireReadableEvent(principal, eventId);
  const row = await database.eventConfigurationRevision.findFirst({ where: { id: revisionId, eventId } });
  if (row === null) {
    throw notFoundProblem();
  }
  return toDto(row);
}
