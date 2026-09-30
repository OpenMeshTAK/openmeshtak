import type { Uuid } from "../../shared/http/uuid.js";
import type { PageInfo } from "../../shared/pagination/cursor.js";

export interface UserDto {
  id: Uuid;
  displayName: string;
  /** Sign-in and TAK login name, or `null` when the user has no local login yet. */
  username: string | null;
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
  /**
   * New sign-in and TAK login name; only for users with a local login. Apps enrolled with the old
   * name keep working, because client certificates name the user ID.
   * @pattern ^[a-z0-9._-]{3,32}$
   */
  username?: string;
}

export interface UserPage {
  items: UserDto[];
  page: PageInfo;
}
