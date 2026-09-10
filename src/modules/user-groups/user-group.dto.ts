import type { PermissionGrantDto } from "../../shared/auth/permission-grant.dto.js";
import type { Uuid } from "../../shared/http/uuid.js";
import type { PageInfo } from "../../shared/pagination/cursor.js";
import type { Slug } from "../events/event.dto.js";

export interface UserGroupDto {
  id: Uuid;
  name: string;
  slug: string;
  /**
   * Protected group managed by the server, such as the setup Admin group. It cannot be deleted,
   * its permissions cannot change and it always keeps at least one member.
   */
  system: boolean;
  /** Optimistic-concurrency version; send it back unchanged with updates. */
  version: number;
  memberCount: number;
  permissions: PermissionGrantDto[];
  /** @format date-time */
  createdAt: string;
  /** @format date-time */
  updatedAt: string;
}

export interface UserGroupPage {
  items: UserGroupDto[];
  page: PageInfo;
}

export interface CreateUserGroupRequest {
  /**
   * @minLength 1
   * @maxLength 100
   */
  name: string;
  slug: Slug;
  /** @maxItems 200 */
  permissions: PermissionGrantDto[];
}

export interface UpdateUserGroupRequest {
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
   * Complete replacement of the group's grants.
   * @maxItems 200
   */
  permissions: PermissionGrantDto[];
}
