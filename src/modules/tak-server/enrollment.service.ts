import { createHash, randomBytes, randomUUID } from "node:crypto";
import { recordAudit } from "../../shared/audit/audit.js";
import type { ActorContext } from "../../shared/auth/principal.js";
import { database } from "../../shared/database/database.js";
import { forbidden } from "../../shared/auth/permission-check.js";
import { notFoundProblem, ProblemError } from "../../shared/errors/problem-error.js";
import { authenticateTakClient } from "./client-authentication.js";
import { CertificateRequestError, issueClientCertificate, validateCertificateRequest } from "./client-certificates.js";
import { trustedCertificateAuthorities } from "./certificate-authority.js";
import { hasAnyTakAccess, takAccessFor } from "./tak-access.js";
import type { TakEnrollmentDto } from "./enrollment.dto.js";
import { loadTakServerSettings } from "./tak-server-settings.js";
import { hasPublicServerCertificate } from "./server-certificate.js";
import { x509 } from "./x509.js";
import { auth } from "../auth/auth.js";
import { normalizeUsername } from "../users/usernames.js";

/** QR tokens of accounts without an event end date stay valid this long. */
const FALLBACK_QR_TOKEN_DAYS = 30;
const DAY = 24 * 60 * 60_000;

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
 * A QR token lasts until the latest end of the user's active events, so a TAK app can re-enroll
 * with it during the event, for example after its certificate expired.
 */
async function qrTokenExpiry(userId: string, now: Date): Promise<Date> {
  const latest = await database.event.findFirst({
    where: { status: "active", endsAt: { gt: now }, members: { some: { userId } } },
    orderBy: { endsAt: "desc" },
    select: { endsAt: true },
  });
  return latest?.endsAt ?? new Date(now.getTime() + FALLBACK_QR_TOKEN_DAYS * DAY);
}

/**
 * Everything the signed-in user needs to connect a TAK app: the account username for manual
 * login (with the account password) and, when the server has a publicly trusted certificate, a
 * fresh QR token for ATAK's QR enrollment, so the QR code never carries the password. Earlier QR
 * tokens that no app ever used are revoked.
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
  const { username } = await database.user.findUniqueOrThrow({
    where: { id: actor.principal.authSubjectId },
    select: { username: true },
  });
  if (username === null) {
    throw new Error("Every account has a username; the startup backfill did not run.");
  }

  const login = {
    username,
    hostName: settings.hostName,
    enrollmentPort: settings.enrollmentPort,
    streamingPort: settings.streamingPort,
  };
  if (!(await hasPublicServerCertificate(settings.hostName, now))) {
    return { ...login, atakEnrollmentUrl: null, expiresAt: null };
  }

  const token = randomBytes(18).toString("base64url");
  const expiresAt = await qrTokenExpiry(userId, now);
  const id = randomUUID();
  await database.$transaction(async (transaction) => {
    await transaction.takEnrollmentToken.deleteMany({ where: { userId, usedAt: null } });
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
  const query = new URLSearchParams({ host, username, token });
  return {
    ...login,
    expiresAt: expiresAt.toISOString(),
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

interface EnrollmentLogin {
  userId: string;
  username: string;
  /** The QR token used instead of the password, if any. */
  tokenId: string | null;
}

async function passwordMatches(authSubjectId: string, password: string): Promise<boolean> {
  const context = await auth.$context;
  const account = await context.internalAdapter.findCredentialAccount(authSubjectId);
  return typeof account?.password === "string" && (await context.password.verify({ hash: account.password, password }));
}

/**
 * TAK apps send HTTP Basic credentials: the account username with either the account password
 * (typed by hand) or a QR token. Usernames are case-insensitive like the Web sign-in.
 */
async function authenticateEnrollmentLogin(authorization: string | undefined, now: Date): Promise<EnrollmentLogin | null> {
  const credentials = parseBasic(authorization);
  if (credentials === null) {
    return null;
  }
  const user = await database.user.findUnique({
    where: { username: normalizeUsername(credentials.username) },
    select: { id: true, username: true, domainUser: { select: { id: true, disabledAt: true } } },
  });
  const domainUser = user?.domainUser;
  if (user === null || user.username === null || domainUser === null || domainUser === undefined || domainUser.disabledAt !== null) {
    return null;
  }

  const token = await database.takEnrollmentToken.findUnique({ where: { tokenHash: hashToken(credentials.password) } });
  if (token !== null && token.userId === domainUser.id && token.expiresAt > now) {
    return { userId: domainUser.id, username: user.username, tokenId: token.id };
  }
  return (await passwordMatches(user.id, credentials.password))
    ? { userId: domainUser.id, username: user.username, tokenId: null }
    : null;
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
 * Signs the CSR of an enrolling TAK app after checking its credentials. The user must still have
 * TAK access at that moment; the certificate names the stable user ID, not the username.
 */
export async function signEnrollmentRequest(
  authorization: string | undefined,
  csr: string,
  clientUid: string | null,
  now = new Date(),
): Promise<SignedEnrollment> {
  const login = await authenticateEnrollmentLogin(authorization, now);
  if (login === null) {
    throw new EnrollmentAuthenticationError("invalid enrollment credentials");
  }

  const request = await validateCertificateRequest(csr, login.username);
  if (!hasAnyTakAccess(await takAccessFor(login.userId))) {
    throw new EnrollmentAuthenticationError("no TAK access");
  }
  if (login.tokenId !== null) {
    // Marks the QR token as in use, so a newer QR code does not revoke it.
    await database.takEnrollmentToken.updateMany({ where: { id: login.tokenId, usedAt: null }, data: { usedAt: now } });
  }

  const settings = await loadTakServerSettings();
  const { certificate, row } = await issueClientCertificate(login.userId, request, settings.clientCertificateDays, clientUid);
  await recordAudit({
    actor: { type: "user", id: login.userId },
    action: "tak-server.client-certificate-issued",
    targetType: "tak-client-certificate",
    targetId: row.id,
    result: "success",
    traceId: randomUUID(),
    metadata: {
      serialNumber: row.serialNumber,
      fingerprintSha256: row.fingerprintSha256,
      clientUid,
      notAfter: row.notAfter.toISOString(),
      credential: login.tokenId === null ? "password" : "qr-token",
    },
  });

  const authorities = await trustedCertificateAuthorities(now);
  return {
    signedCertificate: base64Der(certificate),
    authorities: authorities.map(({ certificatePem }) => base64Der(new x509.X509Certificate(certificatePem))),
  };
}

export { CertificateRequestError };

/**
 * Who asks for the enrollment profile. Apps call it right after `signClient`, either with their new
 * client certificate or again with the enrollment credentials.
 */
export async function authenticateProfileRequest(
  authorization: string | undefined,
  certificateDer: Buffer | undefined,
  now = new Date(),
): Promise<string | null> {
  if (certificateDer !== undefined) {
    const client = await authenticateTakClient(certificateDer, now);
    if (client !== null) {
      return client.userId;
    }
  }
  const login = await authenticateEnrollmentLogin(authorization, now);
  return login !== null && hasAnyTakAccess(await takAccessFor(login.userId)) ? login.userId : null;
}
