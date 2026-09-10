import type { Prisma } from "../../generated/prisma/client.js";
import type { EventMemberDto, SyncIssueDto, SyncIssueReason } from "./event-member.dto.js";

export const eventMemberSelection = {
  id: true,
  eventId: true,
  userId: true,
  version: true,
  createdAt: true,
  updatedAt: true,
  user: { select: { displayName: true } },
  eventRole: { select: { id: true, slug: true, name: true } },
  eventGroup: { select: { id: true, slug: true, name: true } },
} satisfies Prisma.EventMemberSelect;

export type EventMemberRow = Prisma.EventMemberGetPayload<{ select: typeof eventMemberSelection }>;

export function toEventMemberDto(row: EventMemberRow): EventMemberDto {
  return {
    id: row.id,
    eventId: row.eventId,
    userId: row.userId,
    displayName: row.user.displayName,
    eventRole: row.eventRole,
    eventGroup: row.eventGroup,
    version: row.version,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

type SyncIssueRow = Prisma.SyncIssueGetPayload<object>;

export function toSyncIssueDto(row: SyncIssueRow): SyncIssueDto {
  return {
    id: row.id,
    eventId: row.eventId,
    provider: row.provider,
    externalId: row.externalId,
    status: row.status,
    username: row.username,
    requestedRole: row.requestedRole,
    requestedGroup: row.requestedGroup,
    // Written only by the sync service from SyncIssueReason values.
    reasons: row.reasons as unknown as SyncIssueReason[],
    occurrences: row.occurrences,
    resolvedAt: row.resolvedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}
