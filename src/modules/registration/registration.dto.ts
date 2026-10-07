import type { Uuid } from "../../shared/http/uuid.js";
import type { AccountInviteStatus } from "../users/account-invites.js";

/**
 * Who may create their own account: nobody (`closed`, the default), people holding a
 * registration invite (`invite`), or anyone who can reach the instance (`open`).
 */
export type RegistrationMode = "closed" | "invite" | "open";

export interface RegistrationStatusDto {
  mode: RegistrationMode;
}

export interface RegistrationSettingsDto {
  mode: RegistrationMode;
  /** Optimistic-concurrency version; `0` while the defaults were never saved. */
  version: number;
}

export interface UpdateRegistrationSettingsRequest {
  /**
   * @isInt
   * @minimum 0
   */
  version: number;
  mode: RegistrationMode;
}

export interface RegisterRequest {
  /**
   * @minLength 1
   * @maxLength 100
   */
  displayName: string;
  /**
   * Sign-in and TAK login name: 3 to 32 lowercase letters, digits, dots, underscores or hyphens.
   * @pattern ^[a-z0-9._-]{3,32}$
   */
  username: string;
  /**
   * @minLength 12
   * @maxLength 128
   */
  password: string;
  /**
   * Registration invite; required while registration is invite-only.
   * @maxLength 200
   */
  inviteToken?: string;
}

export interface RegisterResponse {
  user: {
    id: Uuid;
    displayName: string;
    username: string;
  };
}

export interface RegistrationInviteDto {
  id: Uuid;
  status: AccountInviteStatus;
  /** @format date-time */
  expiresAt: string;
  /** @format date-time */
  consumedAt: string | null;
  /** @format date-time */
  revokedAt: string | null;
  /** @format date-time */
  createdAt: string;
}

export interface CreatedRegistrationInviteResponse {
  invite: RegistrationInviteDto;
  /**
   * Single-use registration link, returned exactly once. The token travels in the URL fragment,
   * which browsers never send to the server.
   */
  inviteUrl: string;
}
