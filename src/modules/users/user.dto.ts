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
  /** `false` until the user has set a password; a setup link can then sign them in once. */
  passwordSet: boolean;
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

export interface CreateUserRequest {
  /**
   * @minLength 1
   * @maxLength 100
   */
  displayName: string;
  /**
   * Sign-in and TAK login name; derived from the display name when omitted. The person may still
   * change it while setting up the account.
   * @pattern ^[a-z0-9._-]{3,32}$
   */
  username?: string;
}

export interface SetupLinkDto {
  /**
   * Single-use link for the user, returned exactly once. The token travels in the URL fragment,
   * which browsers never send to the server; the Web application exchanges it in a request body.
   */
  url: string;
  /** @format date-time */
  expiresAt: string;
}

export interface CreatedUserResponse {
  user: UserDto;
  setupLink: SetupLinkDto;
}

export interface SetupLinkExchangeRequest {
  /** @maxLength 200 */
  token: string;
}

export interface SetupLinkExchangeResponse {
  user: {
    id: Uuid;
    displayName: string;
  };
}

export interface UserPage {
  items: UserDto[];
  page: PageInfo;
}
