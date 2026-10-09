import type { Uuid } from "../../shared/http/uuid.js";

/** A client certificate issued to a TAK app. Certificates are public; no key material exists here. */
export interface TakClientCertificateDto {
  id: Uuid;
  userId: Uuid;
  userDisplayName: string;
  /** Device UID the app sent during enrollment, if any. */
  clientUid: string | null;
  serialNumber: string;
  fingerprintSha256: string;
  status: "valid" | "expired" | "revoked";
  /** @format date-time */
  notBefore: string;
  /** @format date-time */
  notAfter: string;
  /** @format date-time */
  revokedAt: string | null;
  revocationReason: string | null;
  /**
   * First streaming connection with this certificate; `null` while an app never connected.
   * @format date-time
   */
  firstConnectedAt: string | null;
  /** @format date-time */
  lastConnectedAt: string | null;
  /** What the app last reported about itself; `null` until it sent its own position. */
  device: TakReportedDeviceDto | null;
  /**
   * Issued before the TAK server's host name or a port last changed; the app may still use the old
   * endpoint and must enroll again.
   */
  issuedForOldEndpoint: boolean;
}

/**
 * The app's own description from the `takv` and `contact` details of its position beacon. Set by
 * the app, so it names the device but proves nothing.
 */
export interface TakReportedDeviceDto {
  /** Device model, e.g. `iPhone 17`. */
  name: string | null;
  /** TAK app, e.g. `iTAK` or `WinTAK-CIV`. */
  app: string | null;
  appVersion: string | null;
  os: string | null;
  callsign: string | null;
}

export interface RevokeTakCertificateRequest {
  /** @maxLength 200 */
  reason?: string | null;
}
