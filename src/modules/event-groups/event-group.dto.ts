import type { Slug } from "../events/event.dto.js";
import type { GroupProvisioning } from "./group-provisioning.js";
import type { Uuid } from "../../shared/http/uuid.js";
import type { PageInfo } from "../../shared/pagination/cursor.js";

export interface EventGroupDto {
  id: Uuid;
  eventId: Uuid;
  name: string;
  /** Stable key used by integrations, unique within the event, e.g. `bravo`. */
  slug: string;
  description: string | null;
  /** Callsign, TAK and Meshtastic settings shared by every member of the group. */
  provisioning: GroupProvisioning;
  /** Optimistic-concurrency version; send it back unchanged with updates. */
  version: number;
  /** @format date-time */
  createdAt: string;
  /** @format date-time */
  updatedAt: string;
}

export interface EventGroupPage {
  items: EventGroupDto[];
  page: PageInfo;
}

export interface CreateEventGroupRequest {
  /**
   * @minLength 1
   * @maxLength 100
   */
  name: string;
  slug: Slug;
  /** @maxLength 500 */
  description?: string | null;
  /** Optional; defaults to the plain username, Cyan, Team Member and the first slug letter. */
  provisioning?: GroupProvisioning;
}

export interface UpdateEventGroupRequest {
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
  /** Complete replacement of the provisioning settings. */
  provisioning: GroupProvisioning;
}
