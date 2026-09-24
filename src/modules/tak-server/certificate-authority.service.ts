import type { TakCertificateAuthority } from "../../generated/prisma/client.js";
import { recordAudit } from "../../shared/audit/audit.js";
import { requirePermission, requireRecentAuthentication } from "../../shared/auth/permission-check.js";
import type { ActorContext, Principal } from "../../shared/auth/principal.js";
import { notFoundProblem } from "../../shared/errors/problem-error.js";
import { importCertificateAuthority, trustedCertificateAuthorities } from "./certificate-authority.js";
import type {
  ImportTakCertificateAuthorityRequest,
  TakCertificateAuthorityDto,
} from "./certificate-authority.dto.js";

function toDto(row: TakCertificateAuthority): TakCertificateAuthorityDto {
  return {
    id: row.id,
    origin: row.origin as TakCertificateAuthorityDto["origin"],
    active: row.activeSlot !== null,
    subject: row.subject,
    fingerprintSha256: row.fingerprintSha256,
    notBefore: row.notBefore.toISOString(),
    notAfter: row.notAfter.toISOString(),
    certificatePem: row.certificatePem,
  };
}

/** The active CA first, then older CAs that clients still trust. Creates the first CA if needed. */
export async function listCertificateAuthorities(principal: Principal): Promise<TakCertificateAuthorityDto[]> {
  await requirePermission(principal, "tak-server.manage");
  return (await trustedCertificateAuthorities()).map(toDto);
}

/** Replacing the CA changes what every TAK client must trust, so it needs a recent sign-in. */
export async function importTakCertificateAuthority(
  actor: ActorContext,
  input: ImportTakCertificateAuthorityRequest,
): Promise<TakCertificateAuthorityDto> {
  await requirePermission(actor.principal, "tak-server.manage");
  if (actor.principal.type !== "user") {
    throw notFoundProblem();
  }
  requireRecentAuthentication(actor.principal);

  const imported = await importCertificateAuthority(input.certificatePem, input.privateKeyPem);
  await recordAudit({
    actor: actor.principal,
    action: "tak-server.certificate-authority-imported",
    targetType: "tak-certificate-authority",
    targetId: imported.id,
    result: "success",
    traceId: actor.traceId,
    metadata: { subject: imported.subject, fingerprintSha256: imported.fingerprintSha256 },
  });
  return toDto(imported);
}
