import { randomUUID } from "node:crypto";
import { recordAudit } from "../../shared/audit/audit.js";
import {
  eventAccessFor,
  hasPermission,
  requirePermission,
} from "../../shared/auth/permission-check.js";
import type { ActorContext, Principal } from "../../shared/auth/principal.js";
import { database } from "../../shared/database/database.js";
import { isUniqueConstraintError } from "../../shared/database/unique-constraint.js";
import {
  notFoundProblem,
  ProblemError,
  validationProblem,
  versionConflictProblem,
  type ProblemFieldError,
} from "../../shared/errors/problem-error.js";
import {
  afterCursor,
  CURSOR_ORDER,
  DEFAULT_PAGE_LIMIT,
  decodeCursor,
  toPage,
} from "../../shared/pagination/cursor.js";
import { canonicalIanaTimeZone } from "../../shared/validation/time-zone.js";
import type {
  CreateEventRequest,
  EventDto,
  EventPage,
  EventStatus,
  UpdateEventRequest,
} from "./event.dto.js";

interface EventRow {
  id: string;
  name: string;
  slug: string;
  timeZone: string;
  status: EventStatus;
  version: number;
  startsAt: Date | null;
  endsAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

interface EventSettings {
  name: string;
  slug: string;
  timeZone: string;
  startsAt: Date | null;
  endsAt: Date | null;
}

function toDto(row: EventRow): EventDto {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    timeZone: row.timeZone,
    status: row.status,
    version: row.version,
    startsAt: row.startsAt?.toISOString() ?? null,
    endsAt: row.endsAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function slugConflict(): ProblemError {
  return new ProblemError({
    type: "urn:openmeshtak:problem:slug-conflict",
    title: "Slug already in use",
    status: 409,
    detail: "Another event already uses this slug.",
    code: "SLUG_CONFLICT",
  });
}

function eventArchived(): ProblemError {
  return new ProblemError({
    type: "urn:openmeshtak:problem:event-archived",
    title: "Event is archived",
    status: 409,
    detail: "Archived events are read-only. Reactivate the event before changing it.",
    code: "EVENT_ARCHIVED",
  });
}

function validateSettings(input: {
  name: string;
  slug: string;
  timeZone: string;
  startsAt?: string | null | undefined;
  endsAt?: string | null | undefined;
}): EventSettings {
  const errors: ProblemFieldError[] = [];
  const timeZone = canonicalIanaTimeZone(input.timeZone);
  const startsAt = input.startsAt === undefined || input.startsAt === null ? null : new Date(input.startsAt);
  const endsAt = input.endsAt === undefined || input.endsAt === null ? null : new Date(input.endsAt);

  if (timeZone === null) {
    errors.push({
      field: "timeZone",
      code: "INVALID_TIME_ZONE",
      message: "Use an IANA time-zone identifier such as Europe/Berlin.",
    });
  }
  if (startsAt !== null && endsAt !== null && endsAt < startsAt) {
    errors.push({ field: "endsAt", code: "BEFORE_START", message: "The end must not precede the start." });
  }
  if (errors.length > 0 || timeZone === null) {
    throw validationProblem(errors);
  }

  return { name: input.name, slug: input.slug, timeZone, startsAt, endsAt };
}

/**
 * Callers without read access receive the same `404` as for a missing event, so event IDs
 * outside their scope cannot be discovered.
 */
async function findReadableEvent(principal: Principal, id: string): Promise<EventRow> {
  if (!(await hasPermission(principal, "events.read", id))) {
    throw notFoundProblem();
  }

  const row = await database.event.findUnique({ where: { id } });
  if (row === null) {
    throw notFoundProblem();
  }
  return row;
}

export async function listEvents(
  principal: Principal,
  options: { limit?: number | undefined; cursor?: string | undefined; status?: EventStatus | undefined },
): Promise<EventPage> {
  const limit = options.limit ?? DEFAULT_PAGE_LIMIT;
  const context = `events?status=${options.status ?? ""}`;
  const position = options.cursor === undefined ? null : decodeCursor(context, options.cursor);
  const access = await eventAccessFor(principal, "events.read");

  if (!access.all && access.eventIds.length === 0) {
    return { items: [], page: { nextCursor: null, hasMore: false } };
  }

  const rows = await database.event.findMany({
    where: {
      ...(access.all ? {} : { id: { in: access.eventIds } }),
      ...(options.status === undefined ? {} : { status: options.status }),
      ...afterCursor(position),
    },
    orderBy: [...CURSOR_ORDER],
    take: limit + 1,
  });

  return toPage(context, rows, limit, toDto);
}

export async function getEvent(principal: Principal, id: string): Promise<EventDto> {
  return toDto(await findReadableEvent(principal, id));
}

/** New events always start as `draft`; the lifecycle changes only through explicit transitions. */
export async function createEvent(actor: ActorContext, input: CreateEventRequest): Promise<EventDto> {
  await requirePermission(actor.principal, "events.manage");
  const settings = validateSettings(input);
  const id = randomUUID();

  try {
    const row = await database.$transaction(async (transaction) => {
      const created = await transaction.event.create({ data: { id, ...settings } });
      await recordAudit(
        {
          actor: actor.principal,
          action: "event.created",
          targetType: "event",
          targetId: id,
          result: "success",
          traceId: actor.traceId,
          metadata: { slug: settings.slug, status: created.status },
        },
        transaction,
      );
      return created;
    });
    return toDto(row);
  } catch (error: unknown) {
    throw isUniqueConstraintError(error) ? slugConflict() : error;
  }
}

export async function updateEvent(
  actor: ActorContext,
  id: string,
  input: UpdateEventRequest,
): Promise<EventDto> {
  const current = await findReadableEvent(actor.principal, id);
  await requirePermission(actor.principal, "events.manage", id);

  if (current.status === "archived") {
    throw eventArchived();
  }
  if (current.version !== input.version) {
    throw versionConflictProblem(current.version);
  }
  const settings = validateSettings(input);

  try {
    await database.$transaction(async (transaction) => {
      // Version and status predicates make the check-and-write atomic against concurrent changes.
      const updated = await transaction.event.updateMany({
        where: { id, version: input.version, status: { not: "archived" } },
        data: { ...settings, version: { increment: 1 } },
      });
      if (updated.count !== 1) {
        const latest = await transaction.event.findUniqueOrThrow({
          where: { id },
          select: { status: true, version: true },
        });
        throw latest.status === "archived" ? eventArchived() : versionConflictProblem(latest.version);
      }

      await recordAudit(
        {
          actor: actor.principal,
          action: "event.updated",
          targetType: "event",
          targetId: id,
          result: "success",
          traceId: actor.traceId,
          metadata: {
            changedFields: (Object.keys(settings) as Array<keyof EventSettings>).filter(
              (field) => String(settings[field]) !== String(current[field]),
            ),
          },
        },
        transaction,
      );
    });
  } catch (error: unknown) {
    throw isUniqueConstraintError(error) ? slugConflict() : error;
  }

  return toDto(await database.event.findUniqueOrThrow({ where: { id } }));
}
