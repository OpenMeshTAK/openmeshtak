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
}

export interface RevokeTakCertificateRequest {
  /** @maxLength 200 */
  reason?: string | null;
}
