import { randomBytes, randomUUID } from "node:crypto";
import { recordAudit } from "../../shared/audit/audit.js";
import { forbidden } from "../../shared/auth/permission-check.js";
import type { ActorContext } from "../../shared/auth/principal.js";
import { database } from "../../shared/database/database.js";
import { notFoundProblem, ProblemError } from "../../shared/errors/problem-error.js";
import { issueClientCertificate } from "./client-certificates.js";
import { validPackageCertificate } from "./client-certificates.service.js";
import { trustedCertificateAuthorities } from "./certificate-authority.js";
import { buildItakConnectionPackage } from "./itak-connection-package.js";
import { serverTrustAnchors } from "./server-certificate.js";
import { hasAnyTakAccess, takAccessFor } from "./tak-access.js";
import { loadTakServerSettings } from "./tak-server-settings.js";
import { exportPrivateKeyPem, generateRsaKeyPair, RSA_SIGNING, x509 } from "./x509.js";

/** Device UID prefix of certificates issued inside a downloaded iTAK package. */
export const ITAK_PACKAGE_UID_PREFIX = "ITAK-PACKAGE-";

/** Refuses a second iTAK package while the certificate of an earlier one is still valid. */
export async function requireNoValidItakPackage(userId: string): Promise<void> {
  if ((await validPackageCertificate(userId, ITAK_PACKAGE_UID_PREFIX)) !== null) {
    throw new ProblemError({
      type: "urn:openmeshtak:problem:tak-package-certificate-exists",
      title: "iTAK package already issued",
      status: 409,
      detail: "You already have a valid iTAK package certificate. Revoke it under your enrolled TAK apps to download a new package.",
      code: "TAK_PACKAGE_CERTIFICATE_EXISTS",
    });
  }
}

/** iTAK package with an ephemeral generated key and a user-bound client certificate. */
export async function createItakConnectionPackage(actor: ActorContext): Promise<{ fileName: string; bytes: Uint8Array }> {
  if (actor.principal.type !== "user") {
    throw notFoundProblem();
  }
  if (!hasAnyTakAccess(await takAccessFor(actor.principal.id))) {
    throw forbidden();
  }
  const settings = await loadTakServerSettings();
  if (!settings.enabled || settings.hostName === null) {
    throw new ProblemError({
      type: "urn:openmeshtak:problem:tak-server-not-ready",
      title: "TAK server not ready",
      status: 409,
      detail: "The TAK server is not enabled yet. Ask an administrator to set it up.",
      code: "TAK_SERVER_NOT_READY",
    });
  }

  await requireNoValidItakPackage(actor.principal.id);

  const { username } = await database.user.findUniqueOrThrow({
    where: { id: actor.principal.authSubjectId },
    select: { username: true },
  });
  if (username === null) {
    throw new Error("Every account has a username; the startup backfill did not run.");
  }

  const keys = await generateRsaKeyPair();
  const request = await x509.Pkcs10CertificateRequestGenerator.create({
    name: `CN=${username}`,
    keys,
    signingAlgorithm: RSA_SIGNING,
  });
  const clientUid = `${ITAK_PACKAGE_UID_PREFIX}${randomUUID()}`;
  const { certificate, row } = await issueClientCertificate(
    actor.principal.id,
    request,
    settings.clientCertificateDays,
    clientUid,
  );
  const authorities = await trustedCertificateAuthorities();
  const password = randomBytes(18).toString("base64url");
  const artifact = buildItakConnectionPackage({
    hostName: settings.hostName,
    streamingPort: settings.streamingPort,
    martiPort: settings.martiPort,
    serverTrustPems: await serverTrustAnchors(settings.hostName),
    clientCertificatePem: certificate.toString("pem"),
    clientPrivateKeyPem: await exportPrivateKeyPem(keys.privateKey),
    clientCaPems: authorities.map(({ certificatePem }) => certificatePem),
    password,
  });

  await recordAudit({
    actor: actor.principal,
    action: "tak-server.client-certificate-issued",
    targetType: "tak-client-certificate",
    targetId: row.id,
    result: "success",
    traceId: actor.traceId,
    metadata: {
      serialNumber: row.serialNumber,
      fingerprintSha256: row.fingerprintSha256,
      clientUid,
      notAfter: row.notAfter.toISOString(),
      credential: "authenticated-itak-package",
    },
  });
  await recordAudit({
    actor: actor.principal,
    action: "tak-server.itak-connection-package-downloaded",
    targetType: "tak-server",
    targetId: "tak-server",
    result: "success",
    traceId: actor.traceId,
    metadata: { hostName: settings.hostName, settingsVersion: settings.version, certificateId: row.id },
  });
  return artifact;
}
