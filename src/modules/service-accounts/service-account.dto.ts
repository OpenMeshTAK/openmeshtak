import type { Permission } from "../../shared/auth/permissions.js";
import type { Uuid } from "../../shared/http/uuid.js";
import type { PageInfo } from "../../shared/pagination/cursor.js";

export interface PermissionGrantDto {
  permission: Permission;
  /** Event the grant is limited to, or `null` for an instance-wide grant. */
  eventId: Uuid | null;
}

export type ServiceAccountStatus = "active" | "disabled";

export interface ServiceAccountDto {
  /** @format uuid */
  id: string;
  name: string;
  description: string | null;
  status: ServiceAccountStatus;
  /** Optimistic-concurrency version; send it back unchanged with updates. */
  version: number;
  permissions: PermissionGrantDto[];
  /** @format date-time */
  createdAt: string;
  /** @format date-time */
  updatedAt: string;
}

export interface ServiceAccountPage {
  items: ServiceAccountDto[];
  page: PageInfo;
}

export interface CreateServiceAccountRequest {
  /**
   * @minLength 1
   * @maxLength 100
   */
  name: string;
  /** @maxLength 500 */
  description?: string | null;
  /** @maxItems 100 */
  permissions: PermissionGrantDto[];
}

export interface UpdateServiceAccountRequest {
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
  /** @maxLength 500 */
  description: string | null;
  /** Disabling an account immediately invalidates all of its API keys. */
  status: ServiceAccountStatus;
  /**
   * Complete replacement of the account's grants.
   * @maxItems 100
   */
  permissions: PermissionGrantDto[];
}

export type ApiKeyStatus = "active" | "expired" | "revoked";

export interface ApiKeyDto {
  /** @format uuid */
  id: string;
  /** @format uuid */
  serviceAccountId: string;
  name: string;
  /** Recognizable, non-secret beginning of the key. */
  displayPrefix: string;
  status: ApiKeyStatus;
  /** @format date-time */
  expiresAt: string | null;
  /** @format date-time */
  lastUsedAt: string | null;
  /** @format date-time */
  revokedAt: string | null;
  /** @format date-time */
  createdAt: string;
}

export interface ApiKeyPage {
  items: ApiKeyDto[];
  page: PageInfo;
}

export interface CreateApiKeyRequest {
  /**
   * @minLength 1
   * @maxLength 100
   */
  name: string;
  /**
   * Optional expiry instant; must lie in the future.
   * @format date-time
   */
  expiresAt?: string | null;
}

export interface CreatedApiKeyResponse {
  apiKey: ApiKeyDto;
  /** Complete bearer value. It is returned exactly once and cannot be retrieved again. */
  key: string;
}
