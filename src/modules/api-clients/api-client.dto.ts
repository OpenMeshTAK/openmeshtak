import type { PermissionGrantDto } from "../../shared/auth/permission-grant.dto.js";
import type { PageInfo } from "../../shared/pagination/cursor.js";

export type ApiClientStatus = "active" | "disabled";

export interface ApiClientDto {
  /** @format uuid */
  id: string;
  name: string;
  description: string | null;
  status: ApiClientStatus;
  /** Optimistic-concurrency version; send it back unchanged with updates. */
  version: number;
  permissions: PermissionGrantDto[];
  /** @format date-time */
  createdAt: string;
  /** @format date-time */
  updatedAt: string;
}

export interface ApiClientPage {
  items: ApiClientDto[];
  page: PageInfo;
}

export interface CreateApiClientRequest {
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

export interface UpdateApiClientRequest {
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
  status: ApiClientStatus;
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
  apiClientId: string;
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
