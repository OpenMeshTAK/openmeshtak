export type SmtpSecurity = "starttls" | "tls" | "none";

/** SMTP settings without the password, which is write-only. */
export interface EmailSettingsDto {
  enabled: boolean;
  host: string | null;
  port: number;
  security: SmtpSecurity;
  username: string | null;
  /** Whether a password is stored. The password itself is never returned. */
  passwordSet: boolean;
  fromAddress: string | null;
  fromName: string;
  /** Optimistic-concurrency version; 0 until first saved. */
  version: number;
}

export interface UpdateEmailSettingsRequest {
  /**
   * @isInt
   * @minimum 0
   */
  version: number;
  enabled: boolean;
  /** @maxLength 253 */
  host: string | null;
  /**
   * @isInt
   * @minimum 1
   * @maximum 65535
   */
  port: number;
  security: SmtpSecurity;
  /** @maxLength 200 */
  username: string | null;
  /**
   * Omit to keep the stored password, `null` to remove it.
   * @maxLength 500
   */
  password?: string | null;
  /**
   * @maxLength 254
   * @pattern ^[^\s@]+@[^\s@]+$
   */
  fromAddress: string | null;
  /**
   * @minLength 1
   * @maxLength 100
   */
  fromName: string;
}

export interface SendTestEmailRequest {
  /**
   * @maxLength 254
   * @pattern ^[^\s@]+@[^\s@]+$
   */
  to: string;
}
