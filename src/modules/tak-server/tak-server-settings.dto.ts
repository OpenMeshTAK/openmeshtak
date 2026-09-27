/** The certificate the TAK listeners present. The private key is never returned. */
export interface TakServerCertificateDto {
  /** OpenMeshTak-issued, administrator-added, or obtained automatically through ACME. */
  source: "issued" | "added" | "acme";
  hostName: string;
  subject: string;
  fingerprintSha256: string;
  /** @format date-time */
  notAfter: string;
}

export interface TakServerSettingsDto {
  /** Whether the TAK listeners run. Requires a host name. */
  enabled: boolean;
  /** Public host name or IPv4 address that ATAK and iTAK connect to. */
  hostName: string | null;
  enrollmentPort: number;
  martiPort: number;
  streamingPort: number;
  /** Lifetime of newly enrolled client certificates. */
  clientCertificateDays: number;
  /** `null` until the server first starts or a certificate is added. */
  serverCertificate: TakServerCertificateDto | null;
  /** Optimistic-concurrency version; 0 until first saved. */
  version: number;
}

export interface UpdateTakServerSettingsRequest {
  /**
   * @isInt
   * @minimum 0
   */
  version: number;
  enabled: boolean;
  /** @maxLength 253 */
  hostName: string | null;
  /**
   * @isInt
   * @minimum 1
   * @maximum 65535
   */
  enrollmentPort: number;
  /**
   * @isInt
   * @minimum 1
   * @maximum 65535
   */
  martiPort: number;
  /**
   * @isInt
   * @minimum 1
   * @maximum 65535
   */
  streamingPort: number;
  /**
   * @isInt
   * @minimum 1
   * @maximum 825
   */
  clientCertificateDays: number;
}

export interface AddTakServerCertificateRequest {
  /**
   * Full chain in PEM format, server certificate first, e.g. the `fullchain.pem` of Let's Encrypt.
   * @maxLength 50000
   */
  certificateChainPem: string;
  /**
   * Unencrypted private key in PEM format, e.g. the `privkey.pem` of Let's Encrypt. Encrypted at
   * rest and never returned.
   * @maxLength 20000
   */
  privateKeyPem: string;
}
