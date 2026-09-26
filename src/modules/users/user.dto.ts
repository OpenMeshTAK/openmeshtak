import type { Uuid } from "../../shared/http/uuid.js";
import type { PageInfo } from "../../shared/pagination/cursor.js";

export interface UserDto {
  id: Uuid;
  displayName: string;
  /** Email of the linked local login, or `null` when the user has no local login yet. */
  email: string | null;
  /** Disabled users cannot sign in, keep no sessions and lose TAK access. */
  disabled: boolean;
  /** Optimistic-concurrency version; send it back unchanged with updates. */
  version: number;
  /** @format date-time */
  createdAt: string;
}

export interface UpdateUserRequest {
  /**
   * @isInt
   * @minimum 1
   */
  version: number;
  /**
   * @minLength 1
   * @maxLength 100
   */
  displayName: string;
}

export interface UserPage {
  items: UserDto[];
  page: PageInfo;
}
