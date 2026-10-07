import type { Uuid } from "../../shared/http/uuid.js";
import type { PageInfo } from "../../shared/pagination/cursor.js";
import type { EventOverview } from "./event-overview.js";

export type EventStatus = "draft" | "active" | "archived";

/**
 * Lowercase ASCII letters and digits separated by single hyphens.
 * @pattern ^[a-z0-9]+(?:-[a-z0-9]+)*$
 * @minLength 1
 * @maxLength 64
 */
export type Slug = string;

export interface EventDto {
  id: Uuid;
  name: string;
  slug: string;
  /** IANA time-zone identifier used for event-local schedules, e.g. `Europe/Berlin`. */
  timeZone: string;
  status: EventStatus;
  /** Optimistic-concurrency version; send it back unchanged with updates. */
  version: number;
  /** @format date-time */
  startsAt: string | null;
  /** @format date-time */
  endsAt: string | null;
  /**
   * Days a TAK login token (QR code or typed instead of the password) stays valid. `0` means until
   * the event ends, and without an end date for good. Tokens stop working anyway once the user
   * loses TAK access.
   * @isInt
   * @minimum 0
   * @maximum 3650
   */
  takLoginTokenDays: number;
  /** @format date-time */
  createdAt: string;
  /** @format date-time */
  updatedAt: string;
}

/** An event in the overview list, with the facts organizers act on. */
export interface EventListItemDto extends EventDto {
  overview: EventOverview;
}

export interface EventPage {
  items: EventListItemDto[];
  page: PageInfo;
}

export interface CreateEventRequest {
  /**
   * @minLength 1
   * @maxLength 100
   */
  name: string;
  slug: Slug;
  /**
   * IANA time-zone identifier. Fixed offsets such as `+01:00` are rejected.
   * @minLength 1
   * @maxLength 64
   */
  timeZone: string;
  /**
   * Descriptive start instant; it never changes the lifecycle state.
   * @format date-time
   */
  startsAt?: string | null;
  /**
   * Descriptive end instant; it never changes the lifecycle state.
   * @format date-time
   */
  endsAt?: string | null;
  /**
   * Days a TAK login token (QR code or typed instead of the password) stays valid. `0` means until
   * the event ends, and without an end date for good. Defaults to `0`. Tokens stop working anyway once the user
   * loses TAK access.
   * @isInt
   * @minimum 0
   * @maximum 3650
   */
  takLoginTokenDays?: number;
}

export interface UpdateEventRequest {
  /**
   * Version the client last read.
   * @isInt
   * @minimum 1
   */
  version: number;
  /**
   * @minLength 1
   * @maxLength 100
   */
  name: string;
  slug: Slug;
  /**
   * @minLength 1
   * @maxLength 64
   */
  timeZone: string;
  /** @format date-time */
  startsAt: string | null;
  /** @format date-time */
  endsAt: string | null;
  /**
   * Days a TAK login token (QR code or typed instead of the password) stays valid. `0` means until
   * the event ends, and without an end date for good. Omitted keeps the current value. Tokens stop working anyway once the user
   * loses TAK access.
   * @isInt
   * @minimum 0
   * @maximum 3650
   */
  takLoginTokenDays?: number;
}

export interface EventTransitionRequest {
  /**
   * Version the client last read.
   * @isInt
   * @minimum 1
   */
  version: number;
}
