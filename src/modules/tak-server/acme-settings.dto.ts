export interface AcmeSolverDto {
  challengeType: string;
  provider: string;
  label: string;
}

/** ACME settings and renewal status. Provider tokens and the account key are never returned. */
export interface TakAcmeSettingsDto {
  enabled: boolean;
  email: string | null;
  challengeType: string;
  provider: string;
  cloudflareZoneId: string | null;
  apiTokenSet: boolean;
  availableSolvers: AcmeSolverDto[];
  running: boolean;
  /** @format date-time */
  lastAttemptAt: string | null;
  /** @format date-time */
  lastSuccessAt: string | null;
  lastError: string | null;
  /** Optimistic-concurrency version; 0 until first saved. */
  version: number;
}

export interface UpdateTakAcmeSettingsRequest {
  /**
   * @isInt
   * @minimum 0
   */
  version: number;
  enabled: boolean;
  /** @maxLength 254 */
  email: string | null;
  /** @maxLength 30 */
  challengeType: string;
  /** @maxLength 50 */
  provider: string;
  /** @maxLength 64 */
  cloudflareZoneId: string | null;
  /**
   * Omit to keep the stored token, `null` to remove it. The token is encrypted and write-only.
   * @maxLength 500
   */
  apiToken?: string | null;
}
