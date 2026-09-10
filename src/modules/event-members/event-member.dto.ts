import type { Uuid } from "../../shared/http/uuid.js";
import type { PageInfo } from "../../shared/pagination/cursor.js";
import type { Slug } from "../events/event.dto.js";

/**
 * Opaque lowercase namespace of the external system, e.g. `discord`. It is not a login provider.
 * @pattern ^[a-z0-9][a-z0-9-]{0,31}$
 */
export type ExternalProvider = string;

/**
 * Identifier of the person inside the external system, e.g. a Discord user ID.
 * @pattern ^[A-Za-z0-9._:@-]{1,128}$
 */
export type ExternalId = string;

export interface EventAssignmentSummary {
  id: Uuid;
  slug: string;
  name: string;
}

export interface EventMemberDto {
  id: Uuid;
  eventId: Uuid;
  userId: Uuid;
  displayName: string;
  eventRole: EventAssignmentSummary;
  eventGroup: EventAssignmentSummary;
  version: number;
  /** @format date-time */
  createdAt: string;
  /** @format date-time */
  updatedAt: string;
}

export interface EventMemberPage {
  items: EventMemberDto[];
  page: PageInfo;
}

export interface SyncIssueReason {
  field: "eventRole" | "group";
  code: "NOT_FOUND";
  message: string;
}

export type SyncIssueStatus = "open" | "resolved";

export interface SyncIssueDto {
  id: Uuid;
  eventId: Uuid;
  provider: string;
  externalId: string;
  status: SyncIssueStatus;
  username: string;
  requestedRole: string;
  requestedGroup: string;
  reasons: SyncIssueReason[];
  /** How often the integration reported this unresolved member. */
  occurrences: number;
  /** @format date-time */
  resolvedAt: string | null;
  /** @format date-time */
  createdAt: string;
  /** @format date-time */
  updatedAt: string;
}

export interface SyncIssuePage {
  items: SyncIssueDto[];
  page: PageInfo;
}

export interface ExternalMemberSyncRequest {
  /**
   * Name reported by the external system; used for display and callsigns.
   * @minLength 1
   * @maxLength 100
   */
  username: string;
  /** Slug of an existing event role. */
  eventRole: Slug;
  /** Slug of an existing event group. */
  group: Slug;
}

export interface MemberSyncOutcome {
  outcome: "member";
  change: "created" | "updated" | "unchanged";
  member: EventMemberDto;
}

export interface SyncIssueOutcome {
  outcome: "sync-issue";
  syncIssue: SyncIssueDto;
}

/** Either the resolved membership or the recorded sync issue; never a credential or session. */
export type ExternalMemberSyncResult = MemberSyncOutcome | SyncIssueOutcome;
