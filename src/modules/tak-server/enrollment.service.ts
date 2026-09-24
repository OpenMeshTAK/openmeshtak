import { createHash, randomBytes, randomUUID } from "node:crypto";
import { recordAudit } from "../../shared/audit/audit.js";
import type { ActorContext } from "../../shared/auth/principal.js";
import { database } from "../../shared/database/database.js";
import { forbidden } from "../../shared/auth/permission-check.js";
import { notFoundProblem, ProblemError } from "../../shared/errors/problem-error.js";
import { CertificateRequestError, issueClientCertificate, validateCertificateRequest } from "./client-certificates.js";
import { trustedCertificateAuthorities } from "./certificate-authority.js";
import { hasAnyTakAccess, takAccessFor } from "./tak-access.js";
import type { TakEnrollmentDto } from "./enrollment.dto.js";
import { loadTakServerSettings } from "./tak-server-settings.js";
import { x509 } from "./x509.js";

const TOKEN_MINUTES = 15;

function hashToken(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

function notReady(): ProblemError {
  return new ProblemError({
    type: "urn:openmeshtak:problem:tak-server-not-ready",
    title: "TAK server not ready",
    status: 409,
    detail: "The TAK server is not enabled yet. Ask an administrator to set it up.",
    code: "TAK_SERVER_NOT_READY",
  });
}

/**
 * Creates a single-use enrollment password for the signed-in user. The TAK user name is the
 * user's stable OpenMeshTak ID, so renaming an account never breaks a certificate.
 */
export async function createTakEnrollment(actor: ActorContext, now = new Date()): Promise<TakEnrollmentDto> {
  if (actor.principal.type !== "user") {
    throw notFoundProblem();
  }
  const userId = actor.principal.id;
  if (!hasAnyTakAccess(await takAccessFor(userId))) {
    throw forbidden();
  }
  const settings = await loadTakServerSettings();
  if (!settings.enabled || settings.hostName === null) {
    throw notReady();
  }

  const token = randomBytes(18).toString("base64url");
  const expiresAt = new Date(now.getTime() + TOKEN_MINUTES * 60_000);
  const id = randomUUID();
  await database.$transaction(async (transaction) => {
    await transaction.takEnrollmentToken.create({ data: { id, userId, tokenHash: hashToken(token), expiresAt } });
    await recordAudit(
      {
        actor: actor.principal,
        action: "tak-server.enrollment-created",
        targetType: "tak-enrollment",
        targetId: id,
        result: "success",
        traceId: actor.traceId,
        metadata: { expiresAt: expiresAt.toISOString() },
      },
      transaction,
    );
  });

  const host = `${settings.hostName}:${String(settings.streamingPort)}`;
  const query = new URLSearchParams({ host, username: userId, token });
  return {
    username: userId,
    token,
    expiresAt: expiresAt.toISOString(),
    hostName: settings.hostName,
    enrollmentPort: settings.enrollmentPort,
    streamingPort: settings.streamingPort,
    atakEnrollmentUrl: `tak://com.atakmap.app/enroll?${query.toString()}`,
  };
}

export class EnrollmentAuthenticationError extends Error {}

function parseBasic(authorization: string | undefined): { username: string; password: string } | null {
  const match = /^Basic ([A-Za-z0-9+/=]+)$/.exec(authorization ?? "");
  const decoded = match?.[1] === undefined ? "" : Buffer.from(match[1], "base64").toString("utf8");
  const separator = decoded.indexOf(":");
  return separator <= 0 ? null : { username: decoded.slice(0, separator), password: decoded.slice(separator + 1) };
}

export interface SignedEnrollment {
  /** DER certificates as base64, the client certificate first. */
  signedCertificate: string;
  authorities: string[];
}

function base64Der(certificate: x509.X509Certificate): string {
  return Buffer.from(certificate.rawData).toString("base64");
}

/**
 * Signs the CSR of an enrolling TAK app. The token is looked up by its hash, checked against the
 * user name, consumed atomically only after the request proved valid, and the user must still
 * have TAK access at that moment.
 */
export async function signEnrollmentRequest(
  authorization: string | undefined,
  csr: string,
  clientUid: string | null,
  now = new Date(),
): Promise<SignedEnrollment> {
  const credentials = parseBasic(authorization);
  const token =
    credentials === null
      ? null
      : await database.takEnrollmentToken.findUnique({ where: { tokenHash: hashToken(credentials.password) } });
  if (credentials === null || token === null || token.userId !== credentials.username || token.usedAt !== null || token.expiresAt <= now) {
    throw new EnrollmentAuthenticationError("invalid enrollment credentials");
  }

  const request = await validateCertificateRequest(csr, token.userId);
  if (!hasAnyTakAccess(await takAccessFor(token.userId))) {
    throw new EnrollmentAuthenticationError("no TAK access");
  }
  const consumed = await database.takEnrollmentToken.updateMany({
    where: { id: token.id, usedAt: null },
    data: { usedAt: now },
  });
  if (consumed.count !== 1) {
    throw new EnrollmentAuthenticationError("enrollment token already used");
  }

  const settings = await loadTakServerSettings();
  const { certificate, row } = await issueClientCertificate(token.userId, request, settings.clientCertificateDays, clientUid);
  await recordAudit({
    actor: { type: "user", id: token.userId },
    action: "tak-server.client-certificate-issued",
    targetType: "tak-client-certificate",
    targetId: row.id,
    result: "success",
    traceId: randomUUID(),
    metadata: { serialNumber: row.serialNumber, fingerprintSha256: row.fingerprintSha256, clientUid, notAfter: row.notAfter.toISOString() },
  });

  const authorities = await trustedCertificateAuthorities(now);
  return {
    signedCertificate: base64Der(certificate),
    authorities: authorities.map(({ certificatePem }) => base64Der(new x509.X509Certificate(certificatePem))),
  };
}

export { CertificateRequestError };
