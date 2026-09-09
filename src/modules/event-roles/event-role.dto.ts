import type { Slug } from "../events/event.dto.js";
import type { Uuid } from "../../shared/http/uuid.js";
import type { PageInfo } from "../../shared/pagination/cursor.js";

export interface EventRoleDto {
  id: Uuid;
  eventId: Uuid;
  name: string;
  /** Stable key used by integrations, unique within the event, e.g. `participant`. */
  slug: string;
  description: string | null;
  /** Optimistic-concurrency version; send it back unchanged with updates. */
  version: number;
  /** @format date-time */
  createdAt: string;
  /** @format date-time */
  updatedAt: string;
}

export interface EventRolePage {
  items: EventRoleDto[];
  page: PageInfo;
}

export interface CreateEventRoleRequest {
  /**
   * @minLength 1
   * @maxLength 100
   */
  name: string;
  slug: Slug;
  /** @maxLength 500 */
  description?: string | null;
}

export interface UpdateEventRoleRequest {
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
  /** @maxLength 500 */
  description: string | null;
}
