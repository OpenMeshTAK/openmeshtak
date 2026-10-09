import type { Uuid } from "../../shared/http/uuid.js";
import type { PageInfo } from "../../shared/pagination/cursor.js";

/** A member's place in a TAK group: receiving what is sent into it (in), sending into it (out). */
export interface TakGroupMemberDto {
  memberId: Uuid;
  receive: boolean;
  send: boolean;
}

export interface TakGroupSummaryDto {
  id: Uuid;
  eventId: Uuid;
  name: string;
  description: string | null;
  /** Members that receive what is sent into the group. */
  receiverCount: number;
  /** Members that send into the group. */
  senderCount: number;
  /** Optimistic-concurrency version; send it back unchanged with updates. */
  version: number;
  /** @format date-time */
  createdAt: string;
  /** @format date-time */
  updatedAt: string;
}

/**
 * A free TAK group of the advanced group mode, e.g. `Medics`. Members are assigned per group;
 * roles with `seesAllTakGroups` need no assignment.
 */
export interface TakGroupDto extends TakGroupSummaryDto {
  members: TakGroupMemberDto[];
}

export interface TakGroupPage {
  items: TakGroupSummaryDto[];
  page: PageInfo;
}

export interface CreateTakGroupRequest {
  /**
   * @minLength 1
   * @maxLength 60
   */
  name: string;
  /** @maxLength 500 */
  description?: string | null;
  /** @maxItems 5000 */
  members?: TakGroupMemberDto[];
}

export interface UpdateTakGroupRequest {
  /**
   * Version the client last read.
   * @isInt
   * @minimum 1
   */
  version: number;
  /**
   * @minLength 1
   * @maxLength 60
   */
  name: string;
  /** @maxLength 500 */
  description: string | null;
  /**
   * Replaces the group's members; omit to keep them. Entries with neither `receive` nor `send`
   * are dropped.
   * @maxItems 5000
   */
  members?: TakGroupMemberDto[];
}
