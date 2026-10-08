import { randomUUID } from "node:crypto";
import { recordAudit } from "../../shared/audit/audit.js";
import { eventAccessFor, requirePermission } from "../../shared/auth/permission-check.js";
import type { ActorContext, Principal } from "../../shared/auth/principal.js";
import { database } from "../../shared/database/database.js";
import { isUniqueConstraintError } from "../../shared/database/unique-constraint.js";
import {
  slugConflictProblem,
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
import { eventOverviews } from "./event-overview.js";
import type {
  CreateEventRequest,
  EventDto,
  EventPage,
  EventStatus,
  UpdateEventRequest,
} from "./event.dto.js";
import {
  eventArchivedProblem,
  requireMutableEvent,
  requireReadableEvent,
} from "./event-access.js";

interface EventRow {
  id: string;
  name: string;
  slug: string;
  timeZone: string;
  status: EventStatus;
  version: number;
  startsAt: Date | null;
  endsAt: Date | null;
  takLoginTokenDays: number;
  permanentAccounts: boolean;
  meshtasticEnabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

interface EventSettings {
  name: string;
  slug: string;
  timeZone: string;
  startsAt: Date | null;
  endsAt: Date | null;
  /** Left out on updates that keep the current value. */
  takLoginTokenDays?: number;
  /** Left out on updates that keep the current value. */
  permanentAccounts?: boolean;
  /** Left out on updates that keep the current value. */
  meshtasticEnabled?: boolean;
}

export function toEventDto(row: EventRow): EventDto {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    timeZone: row.timeZone,
    status: row.status,
    version: row.version,
    startsAt: row.startsAt?.toISOString() ?? null,
    endsAt: row.endsAt?.toISOString() ?? null,
    takLoginTokenDays: row.takLoginTokenDays,
    permanentAccounts: row.permanentAccounts,
    meshtasticEnabled: row.meshtasticEnabled,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function validateSettings(input: {
  name: string;
  slug: string;
  timeZone: string;
  startsAt?: string | null | undefined;
  endsAt?: string | null | undefined;
  takLoginTokenDays?: number | undefined;
  permanentAccounts?: boolean | undefined;
  meshtasticEnabled?: boolean | undefined;
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

  const settings: EventSettings = { name: input.name, slug: input.slug, timeZone, startsAt, endsAt };
  if (input.takLoginTokenDays !== undefined) {
    settings.takLoginTokenDays = input.takLoginTokenDays;
  }
  if (input.permanentAccounts !== undefined) {
    settings.permanentAccounts = input.permanentAccounts;
  }
  if (input.meshtasticEnabled !== undefined) {
    settings.meshtasticEnabled = input.meshtasticEnabled;
  }
  return settings;
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

  const overviews = await eventOverviews(rows.slice(0, limit));
  return toPage(context, rows, limit, (row) => {
    const overview = overviews.get(row.id);
    if (overview === undefined) {
      throw new Error("Every listed event has an overview.");
    }
    return { ...toEventDto(row), overview };
  });
}

export async function getEvent(principal: Principal, id: string): Promise<EventDto> {
  return toEventDto(await requireReadableEvent(principal, id));
}

/** New events always start as `draft`; the lifecycle changes only through explicit transitions. */
export async function createEvent(actor: ActorContext, input: CreateEventRequest): Promise<EventDto> {
  await requirePermission(actor.principal, "events.manage");
  const settings = validateSettings(input);
  if (settings.permanentAccounts === true) {
    await requirePermission(actor.principal, "event-accounts.manage");
  }
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
    return toEventDto(row);
  } catch (error: unknown) {
    throw isUniqueConstraintError(error) ? slugConflictProblem("Another event already uses this slug.") : error;
  }
}

export async function updateEvent(
  actor: ActorContext,
  id: string,
  input: UpdateEventRequest,
): Promise<EventDto> {
  const current = await requireMutableEvent(actor.principal, id);
  if (current.version !== input.version) {
    throw versionConflictProblem(current.version);
  }
  const settings = validateSettings(input);
  // Whether new accounts outlive the event is an account decision, not just an event setting.
  if (settings.permanentAccounts !== undefined && settings.permanentAccounts !== current.permanentAccounts) {
    await requirePermission(actor.principal, "event-accounts.manage", id);
  }

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
        throw latest.status === "archived" ? eventArchivedProblem() : versionConflictProblem(latest.version);
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
    throw isUniqueConstraintError(error) ? slugConflictProblem("Another event already uses this slug.") : error;
  }

  return toEventDto(await database.event.findUniqueOrThrow({ where: { id } }));
}
