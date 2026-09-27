import type { TakServerCertificate } from "../../generated/prisma/client.js";
import { recordAudit } from "../../shared/audit/audit.js";
import { requirePermission, requireRecentAuthentication } from "../../shared/auth/permission-check.js";
import type { ActorContext, Principal } from "../../shared/auth/principal.js";
import { database } from "../../shared/database/database.js";
import { isUniqueConstraintError } from "../../shared/database/unique-constraint.js";
import {
  notFoundProblem,
  validationProblem,
  versionConflictProblem,
  type ProblemFieldError,
} from "../../shared/errors/problem-error.js";
import { activeServerCertificate, addServerCertificate, removeAddedServerCertificate } from "./server-certificate.js";
import { takListeners } from "./tak-listeners.js";
import { HOST_NAME, loadTakServerSettings, SETTINGS_ID } from "./tak-server-settings.js";
import type {
  AddTakServerCertificateRequest,
  TakServerCertificateDto,
  TakServerSettingsDto,
  UpdateTakServerSettingsRequest,
} from "./tak-server-settings.dto.js";
import { disableTakAcmeAutomation } from "./acme-settings.service.js";

function certificateDto(certificate: TakServerCertificate | null): TakServerCertificateDto | null {
  return certificate === null
    ? null
    : {
        source: certificate.source as TakServerCertificateDto["source"],
        hostName: certificate.hostName,
        subject: certificate.subject,
        fingerprintSha256: certificate.fingerprintSha256,
        notAfter: certificate.notAfter.toISOString(),
      };
}

async function toDto(): Promise<TakServerSettingsDto> {
  const settings = await loadTakServerSettings();
  return {
    enabled: settings.enabled,
    hostName: settings.hostName,
    enrollmentPort: settings.enrollmentPort,
    martiPort: settings.martiPort,
    streamingPort: settings.streamingPort,
    clientCertificateDays: settings.clientCertificateDays,
    serverCertificate: certificateDto(await activeServerCertificate()),
    version: settings.version,
  };
}

export async function getTakServerSettings(principal: Principal): Promise<TakServerSettingsDto> {
  await requirePermission(principal, "tak-server.manage");
  return toDto();
}

function settingsProblems(input: UpdateTakServerSettingsRequest): ProblemFieldError[] {
  const problems: ProblemFieldError[] = [];
  if (input.hostName !== null && !HOST_NAME.test(input.hostName)) {
    problems.push({
      field: "hostName",
      code: "INVALID_HOST_NAME",
      message: "Use a host name such as tak.example.org or an IPv4 address.",
    });
  }
  if (input.enabled && input.hostName === null) {
    problems.push({ field: "hostName", code: "HOST_NAME_REQUIRED", message: "Set the host name before enabling the TAK server." });
  }
  const ports = [input.enrollmentPort, input.martiPort, input.streamingPort];
  if (new Set(ports).size !== ports.length) {
    problems.push({ field: "streamingPort", code: "DUPLICATE_PORT", message: "Every TAK listener needs its own port." });
  }
  return problems;
}

async function storeSettings(
  actor: ActorContext,
  version: number,
  data: Omit<UpdateTakServerSettingsRequest, "version">,
): Promise<void> {
  await database.$transaction(async (transaction) => {
    if (version === 0) {
      try {
        await transaction.takServerSettings.create({ data: { id: SETTINGS_ID, ...data } });
      } catch (error: unknown) {
        throw isUniqueConstraintError(error) ? versionConflictProblem((await loadTakServerSettings()).version) : error;
      }
    } else {
      const updated = await transaction.takServerSettings.updateMany({
        where: { id: SETTINGS_ID, version },
        data: { ...data, version: { increment: 1 } },
      });
      if (updated.count !== 1) {
        throw versionConflictProblem((await loadTakServerSettings()).version);
      }
    }
    await recordAudit(
      {
        actor: actor.principal,
        action: "tak-server.settings-updated",
        targetType: "tak-server",
        targetId: SETTINGS_ID,
        result: "success",
        traceId: actor.traceId,
        metadata: data,
      },
      transaction,
    );
  });
}

/** Host names are stored lowercase so certificate checks compare like with like. */
export async function updateTakServerSettings(
  actor: ActorContext,
  input: UpdateTakServerSettingsRequest,
): Promise<TakServerSettingsDto> {
  await requirePermission(actor.principal, "tak-server.manage");
  const trimmed = input.hostName?.trim().toLowerCase() ?? "";
  const normalized = { ...input, hostName: trimmed === "" ? null : trimmed };
  const problems = settingsProblems(normalized);
  if (problems.length > 0) {
    throw validationProblem(problems);
  }
  const { version, ...data } = normalized;
  await storeSettings(actor, version, data);
  void takListeners.reload();
  return toDto();
}

function requireRecentUser(actor: ActorContext): void {
  if (actor.principal.type !== "user") {
    throw notFoundProblem();
  }
  requireRecentAuthentication(actor.principal);
}

function serverCertificateAudit(actor: ActorContext, action: string, metadata: Record<string, string>) {
  return recordAudit({
    actor: actor.principal,
    action,
    targetType: "tak-server",
    targetId: SETTINGS_ID,
    result: "success",
    traceId: actor.traceId,
    metadata,
  });
}

/** Adds a publicly trusted server certificate, e.g. from Let's Encrypt, for the configured host name. */
export async function addTakServerCertificate(
  actor: ActorContext,
  input: AddTakServerCertificateRequest,
): Promise<TakServerSettingsDto> {
  await requirePermission(actor.principal, "tak-server.manage");
  requireRecentUser(actor);
  const { hostName } = await loadTakServerSettings();
  if (hostName === null) {
    throw validationProblem([{ field: "hostName", code: "HOST_NAME_REQUIRED", message: "Save the TAK host name first." }]);
  }
  const added = await addServerCertificate(input.certificateChainPem, input.privateKeyPem, hostName);
  await disableTakAcmeAutomation();
  await serverCertificateAudit(actor, "tak-server.server-certificate-added", {
    hostName,
    subject: added.subject,
    fingerprintSha256: added.fingerprintSha256,
    notAfter: added.notAfter.toISOString(),
  });
  void takListeners.reload();
  return toDto();
}

/** Goes back to a server certificate issued by the OpenMeshTak CA. */
export async function removeTakServerCertificate(actor: ActorContext): Promise<TakServerSettingsDto> {
  await requirePermission(actor.principal, "tak-server.manage");
  requireRecentUser(actor);
  await removeAddedServerCertificate();
  await serverCertificateAudit(actor, "tak-server.server-certificate-removed", {});
  void takListeners.reload();
  return toDto();
}
