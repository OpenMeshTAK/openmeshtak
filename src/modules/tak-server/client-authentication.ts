import type { TakClientCertificate } from "../../generated/prisma/client.js";
import { database } from "../../shared/database/database.js";
import { fingerprintOfDer } from "./client-certificates.js";
import { hasAnyTakAccess, takAccessFor, type TakAccess } from "./tak-access.js";

export interface AuthenticatedTakClient {
  certificate: TakClientCertificate;
  userId: string;
  access: TakAccess;
}

/**
 * Maps a client certificate that already passed the TLS handshake against the OpenMeshTak CAs to
 * its user. The handshake proves possession of the key; this adds what TLS cannot know: the
 * certificate must be one Core issued and not revoked, and its user must still have TAK access.
 */
export async function authenticateTakClient(certificateDer: Buffer, now = new Date()): Promise<AuthenticatedTakClient | null> {
  const certificate = await database.takClientCertificate.findUnique({
    where: { fingerprintSha256: fingerprintOfDer(certificateDer) },
  });
  if (certificate === null || certificate.revokedAt !== null || certificate.notAfter <= now || certificate.notBefore > now) {
    return null;
  }
  const access = await takAccessFor(certificate.userId);
  return hasAnyTakAccess(access) ? { certificate, userId: certificate.userId, access } : null;
}
