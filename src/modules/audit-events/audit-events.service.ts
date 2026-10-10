import type { AuditEvent, Prisma } from "../../generated/prisma/client.js";
import { requirePermission } from "../../shared/auth/permission-check.js";
import type { Principal } from "../../shared/auth/principal.js";
import { database } from "../../shared/database/database.js";
import { validationProblem } from "../../shared/errors/problem-error.js";
import { DEFAULT_PAGE_LIMIT, decodeCursor, encodeCursor, type CursorPosition } from "../../shared/pagination/cursor.js";
import { requireEventPermission } from "../events/event-access.js";
import type { AuditEventDto, AuditEventPage, AuditResult, AuditScope } from "./audit-events.dto.js";

const LIST_CONTEXT = "audit-events";

export interface AuditEventQuery {
  limit?: number | undefined;
  cursor?: string | undefined;
  /** Part of the action, target type or target ID. */
  search?: string | undefined;
  result?: AuditResult | undefined;
}

function filterWhere(query: AuditEventQuery): Prisma.AuditEventWhereInput {
  const text = query.search?.trim() ?? "";
  return {
    ...(query.result === undefined ? {} : { result: query.result }),
    ...(text === ""
      ? {}
      : { OR: [{ action: { contains: text } }, { targetType: { contains: text } }, { targetId: { contains: text } }] }),
  };
}

/** Newest first, so a page continues with strictly older entries. */
function beforeCursor(position: CursorPosition | null): Prisma.AuditEventWhereInput {
  if (position === null) {
    return {};
  }
  return {
    OR: [
      { occurredAt: { lt: position.createdAt } },
      { occurredAt: position.createdAt, id: { lt: position.id } },
    ],
  };
}

async function namesOf(rows: AuditEvent[]) {
  const ids = (type: AuditEvent["actorType"]) =>
    [...new Set(rows.flatMap((row) => (row.actorType === type && row.actorId !== null ? [row.actorId] : [])))];
  const eventIds = [...new Set(rows.flatMap(({ eventId }) => (eventId === null ? [] : [eventId])))];
  const [users, clients, events] = await Promise.all([
    database.domainUser.findMany({ where: { id: { in: ids("user") } }, select: { id: true, displayName: true } }),
    database.apiClient.findMany({ where: { id: { in: ids("api_client") } }, select: { id: true, name: true } }),
    database.event.findMany({ where: { id: { in: eventIds } }, select: { id: true, name: true } }),
  ]);
  return {
    actors: new Map([...users.map(({ id, displayName }) => [id, displayName] as const), ...clients.map(({ id, name }) => [id, name] as const)]),
    events: new Map(events.map(({ id, name }) => [id, name])),
  };
}

async function listPage(context: string, scopeWhere: Prisma.AuditEventWhereInput, query: AuditEventQuery): Promise<AuditEventPage> {
  const limit = query.limit ?? DEFAULT_PAGE_LIMIT;
  const position = query.cursor === undefined ? null : decodeCursor(context, query.cursor);
  const rows = await database.auditEvent.findMany({
    where: { AND: [scopeWhere, filterWhere(query), beforeCursor(position)] },
    orderBy: [{ occurredAt: "desc" }, { id: "desc" }],
    take: limit + 1,
  });
  const hasMore = rows.length > limit;
  const pageRows = rows.slice(0, limit);
  const names = await namesOf(pageRows);
  const last = pageRows.at(-1);

  return {
    items: pageRows.map(
      (row): AuditEventDto => ({
        id: row.id,
        occurredAt: row.occurredAt.toISOString(),
        actor: { type: row.actorType, id: row.actorId, name: row.actorId === null ? null : (names.actors.get(row.actorId) ?? null) },
        action: row.action,
        targetType: row.targetType,
        targetId: row.targetId,
        result: row.result,
        eventId: row.eventId,
        eventName: row.eventId === null ? null : (names.events.get(row.eventId) ?? null),
        traceId: row.traceId,
        metadata: row.metadata !== null && typeof row.metadata === "object" && !Array.isArray(row.metadata) ? row.metadata : null,
      }),
    ),
    page: {
      hasMore,
      nextCursor: hasMore && last !== undefined ? encodeCursor(context, { createdAt: last.occurredAt, id: last.id }) : null,
    },
  };
}

/**
 * The whole audit log, newest first. `eventId` keeps one event's entries, scope `instance` the
 * entries that belong to no event. Requires instance-wide `audit.read`.
 */
export async function listAuditEvents(
  principal: Principal,
  query: AuditEventQuery & { eventId?: string | undefined; scope?: AuditScope | undefined },
): Promise<AuditEventPage> {
  await requirePermission(principal, "audit.read");
  if (query.eventId !== undefined && query.scope === "instance") {
    throw validationProblem([
      { field: "scope", code: "CONFLICTS_WITH_EVENT", message: "Choose either an event or the installation scope, not both." },
    ]);
  }
  const scopeWhere: Prisma.AuditEventWhereInput =
    query.eventId !== undefined ? { eventId: query.eventId } : query.scope === "instance" ? { eventId: null } : {};
  const context = `${LIST_CONTEXT}?${query.eventId ?? query.scope ?? "all"}&${query.search ?? ""}&${query.result ?? ""}`;
  return listPage(context, scopeWhere, query);
}

/** One event's audit entries, newest first. Requires `audit.read` for that event. */
export async function listEventAuditEvents(principal: Principal, eventId: string, query: AuditEventQuery): Promise<AuditEventPage> {
  await requireEventPermission(principal, eventId, "audit.read");
  const context = `event-${LIST_CONTEXT}?${eventId}&${query.search ?? ""}&${query.result ?? ""}`;
  return listPage(context, { eventId }, query);
}
