/** The certificate the TAK listeners present. The private key is never returned. */
export interface TakServerCertificateDto {
  /** OpenMeshTak-issued, administrator-added, obtained automatically through ACME, or read from the reverse proxy's files. */
  source: "issued" | "added" | "acme" | "file";
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
  /** The reverse proxy's certificate files Core reads, relative to `certificateDirectory`; `null` unless used. */
  certificateFiles: TakCertificateFilesDto | null;
  /** Where the proxy's certificate directory must be mounted for `certificateFiles`. */
  certificateDirectory: string;
  /**
   * When the public host name or a port last changed after setup; `null` if never. Apps enrolled
   * before it may still use the old endpoint.
   * @format date-time
   */
  endpointChangedAt: string | null;
  /**
   * Valid client certificates. Changing the host name or a port while this is above 0 requires
   * `endpointChange` in the update, because those apps must enroll again.
   * @isInt
   */
  validClientCertificates: number;
  /**
   * Valid client certificates issued before `endpointChangedAt`; their apps may still point to the
   * old endpoint and must enroll again.
   * @isInt
   */
  clientCertificatesToReEnroll: number;
  /** Optimistic-concurrency version; 0 until first saved. */
  version: number;
}

/** The administrator's decision for a host name or port change that affects devices. */
export interface TakEndpointChangeConfirmation {
  /** Email users with enrolled apps that they must set them up again; otherwise only warn here. */
  notifyAffectedUsers: boolean;
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
  /**
   * Required when this update moves a port to a non-standard value, or changes the host name or a
   * port while apps are enrolled. Core never changes a public port on its own.
   */
  endpointChange?: TakEndpointChangeConfirmation;
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

export interface TakCertificateFilesDto {
  /** Full chain, server certificate first, e.g. `live/tak.example.org/fullchain.pem`. */
  certificateFile: string;
  /** Unencrypted private key, e.g. `live/tak.example.org/privkey.pem`. */
  keyFile: string;
}

/** Use the reverse proxy's certificate files; both paths are relative to the mounted directory. */
export interface UseTakCertificateFilesRequest {
  /** @maxLength 500 */
  certificateFile: string;
  /** @maxLength 500 */
  keyFile: string;
}
