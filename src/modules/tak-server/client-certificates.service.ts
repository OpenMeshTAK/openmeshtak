import type { TakClientCertificate } from "../../generated/prisma/client.js";
import { certificateEvents } from "./client-certificates.js";
import { type AuditActor, recordAudit } from "../../shared/audit/audit.js";
import { requirePermission } from "../../shared/auth/permission-check.js";
import type { ActorContext, Principal } from "../../shared/auth/principal.js";
import { database } from "../../shared/database/database.js";
import { notFoundProblem } from "../../shared/errors/problem-error.js";
import type { RevokeTakCertificateRequest, TakClientCertificateDto } from "./client-certificates.dto.js";
import { takConnections } from "./tak-connections.js";
import { loadTakServerSettings } from "./tak-server-settings.js";

type CertificateWithUser = TakClientCertificate & { user: { displayName: string } };

function statusOf(certificate: TakClientCertificate, now: Date): TakClientCertificateDto["status"] {
  if (certificate.revokedAt !== null) {
    return "revoked";
  }
  return certificate.notAfter <= now ? "expired" : "valid";
}

function toDto(certificate: CertificateWithUser, endpointChangedAt: Date | null, now = new Date()): TakClientCertificateDto {
  return {
    id: certificate.id,
    userId: certificate.userId,
    userDisplayName: certificate.user.displayName,
    clientUid: certificate.clientUid,
    serialNumber: certificate.serialNumber,
    fingerprintSha256: certificate.fingerprintSha256,
    status: statusOf(certificate, now),
    notBefore: certificate.notBefore.toISOString(),
    notAfter: certificate.notAfter.toISOString(),
    revokedAt: certificate.revokedAt?.toISOString() ?? null,
    revocationReason: certificate.revocationReason,
    issuedForOldEndpoint: endpointChangedAt !== null && certificate.createdAt < endpointChangedAt,
  };
}

async function toDtos(rows: CertificateWithUser[]): Promise<TakClientCertificateDto[]> {
  const { endpointChangedAt } = await loadTakServerSettings();
  return rows.map((row) => toDto(row, endpointChangedAt));
}

const include = { user: { select: { displayName: true } } } as const;

/** Every issued certificate, newest first. Requires `tak-server.manage`. */
export async function listTakClientCertificates(principal: Principal): Promise<TakClientCertificateDto[]> {
  await requirePermission(principal, "tak-server.manage");
  const rows = await database.takClientCertificate.findMany({ include, orderBy: { createdAt: "desc" }, take: 500 });
  return toDtos(rows);
}

/** The signed-in user's own certificates, so a lost phone can be cut off without an administrator. */
export async function listMyTakCertificates(principal: Principal): Promise<TakClientCertificateDto[]> {
  if (principal.type !== "user") {
    return [];
  }
  const rows = await database.takClientCertificate.findMany({
    where: { userId: principal.id },
    include,
    orderBy: { createdAt: "desc" },
  });
  return toDtos(rows);
}

/** Who revokes: a Web session, or a TAK app that authenticated only for enrollment. */
interface RevokingActor {
  principal: AuditActor;
  traceId: string;
}

/** Revokes a certificate with an audit entry and ends its TAK connections immediately. */
export async function revokeCertificate(actor: RevokingActor, certificate: TakClientCertificate, reason: string | null): Promise<void> {
  if (certificate.revokedAt === null) {
    await database.$transaction(async (transaction) => {
      await transaction.takClientCertificate.update({
        where: { id: certificate.id },
        data: { revokedAt: new Date(), revocationReason: reason },
      });
      await recordAudit(
        {
          actor: actor.principal,
          action: "tak-server.client-certificate-revoked",
          targetType: "tak-client-certificate",
          targetId: certificate.id,
          result: "success",
          traceId: actor.traceId,
          metadata: { userId: certificate.userId, serialNumber: certificate.serialNumber },
        },
        transaction,
      );
    });
  }
  takConnections.disconnectCertificate(certificate.id);
  certificateEvents.emit("revoked", certificate);
}

async function revokedDto(certificateId: string): Promise<TakClientCertificateDto> {
  const row = await database.takClientCertificate.findUniqueOrThrow({ where: { id: certificateId }, include });
  const { endpointChangedAt } = await loadTakServerSettings();
  return toDto(row, endpointChangedAt);
}

/** Revokes any certificate and ends its connections immediately. Requires `tak-server.manage`. */
export async function revokeTakClientCertificate(
  actor: ActorContext,
  certificateId: string,
  input: RevokeTakCertificateRequest,
): Promise<TakClientCertificateDto> {
  await requirePermission(actor.principal, "tak-server.manage");
  const certificate = await database.takClientCertificate.findUnique({ where: { id: certificateId } });
  if (certificate === null) {
    throw notFoundProblem();
  }
  await revokeCertificate(actor, certificate, input.reason ?? null);
  return revokedDto(certificateId);
}

/** Revokes one of the signed-in user's own certificates. */
export async function revokeMyTakCertificate(
  actor: ActorContext,
  certificateId: string,
  input: RevokeTakCertificateRequest,
): Promise<TakClientCertificateDto> {
  const certificate = await database.takClientCertificate.findUnique({ where: { id: certificateId } });
  if (certificate === null || actor.principal.type !== "user" || certificate.userId !== actor.principal.id) {
    throw notFoundProblem();
  }
  await revokeCertificate(actor, certificate, input.reason ?? null);
  return revokedDto(certificateId);
}

/** Unrevoked, unexpired certificates of a user whose device UID matches. */
function validFor(userId: string, clientUid: { equals: string } | { startsWith: string }, now: Date) {
  return { userId, clientUid, revokedAt: null, notAfter: { gt: now } };
}

/**
 * One valid certificate per user and device: when an app enrolls again with the same device UID,
 * for example after its certificate expired or the app was reinstalled, the earlier ones end.
 */
export async function revokeReplacedCertificates(actor: RevokingActor, replacement: TakClientCertificate, now = new Date()): Promise<void> {
  if (replacement.clientUid === null) {
    return;
  }
  const replaced = await database.takClientCertificate.findMany({
    where: { ...validFor(replacement.userId, { equals: replacement.clientUid }, now), id: { not: replacement.id } },
  });
  for (const certificate of replaced) {
    await revokeCertificate(actor, certificate, "Replaced by a new enrollment of the same device");
  }
}

/**
 * The valid certificate a user already received in a downloaded package of this kind. Packages carry
 * their private key, so Core cannot tell devices apart; a new package needs the old one revoked.
 */
export async function validPackageCertificate(userId: string, clientUidPrefix: string, now = new Date()): Promise<TakClientCertificate | null> {
  return database.takClientCertificate.findFirst({ where: validFor(userId, { startsWith: clientUidPrefix }, now) });
}
