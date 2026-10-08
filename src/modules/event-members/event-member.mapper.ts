import type { Prisma } from "../../generated/prisma/client.js";
import type { EventMemberDto, SyncIssueDto, SyncIssueReason } from "./event-member.dto.js";
import { shortNameFor } from "./member-identity.js";

export const eventMemberSelection = {
  id: true,
  eventId: true,
  userId: true,
  version: true,
  username: true,
  callsign: true,
  callsignOverride: true,
  shortNameNumber: true,
  createdAt: true,
  updatedAt: true,
  // Expiry is checked in the mapper, because a selection is built once and cannot hold "now".
  user: {
    select: {
      displayName: true,
      takClientCertificates: { where: { revokedAt: null }, select: { notAfter: true } },
    },
  },
  eventRole: { select: { id: true, slug: true, name: true } },
  eventGroup: { select: { id: true, slug: true, name: true, shortNamePrefix: true } },
} satisfies Prisma.EventMemberSelect;

export type EventMemberRow = Prisma.EventMemberGetPayload<{ select: typeof eventMemberSelection }>;

export function toEventMemberDto(row: EventMemberRow): EventMemberDto {
  const now = new Date();
  return {
    id: row.id,
    eventId: row.eventId,
    userId: row.userId,
    displayName: row.user.displayName,
    username: row.username,
    callsign: row.callsign,
    callsignOverride: row.callsignOverride,
    shortName: shortNameFor(row.eventGroup.shortNamePrefix, row.shortNameNumber),
    eventRole: row.eventRole,
    eventGroup: { id: row.eventGroup.id, slug: row.eventGroup.slug, name: row.eventGroup.name },
    enrolledTakApps: row.user.takClientCertificates.filter(({ notAfter }) => notAfter > now).length,
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
