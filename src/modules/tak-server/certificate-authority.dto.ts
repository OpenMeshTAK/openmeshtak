import type { Uuid } from "../../shared/http/uuid.js";

/** A TAK certificate authority. The certificate is public trust material; the key never leaves Core. */
export interface TakCertificateAuthorityDto {
  id: Uuid;
  origin: "generated" | "imported";
  /** Signs new client and server certificates. */
  active: boolean;
  subject: string;
  /** SHA-256 of the DER certificate, lowercase hex, for comparing with what devices show. */
  fingerprintSha256: string;
  /** @format date-time */
  notBefore: string;
  /** @format date-time */
  notAfter: string;
  certificatePem: string;
}

export interface ImportTakCertificateAuthorityRequest {
  /**
   * The CA certificate in PEM format.
   * @maxLength 20000
   */
  certificatePem: string;
  /**
   * The unencrypted CA private key in PEM format (PKCS#8 or PKCS#1). It is encrypted at rest and
   * never returned.
   * @maxLength 20000
   */
  privateKeyPem: string;
}
