import type { TakAcmeSettings } from "../../generated/prisma/client.js";
import { recordAudit } from "../../shared/audit/audit.js";
import { requirePermission, requireRecentAuthentication } from "../../shared/auth/permission-check.js";
import type { ActorContext, Principal } from "../../shared/auth/principal.js";
import { config } from "../../shared/config/config.js";
import { database } from "../../shared/database/database.js";
import { isUniqueConstraintError } from "../../shared/database/unique-constraint.js";
import { ProblemError, notFoundProblem, validationProblem, versionConflictProblem, type ProblemFieldError } from "../../shared/errors/problem-error.js";
import { ACME_SOLVERS, isSupportedAcmeSolver } from "./acme-challenge.js";
import { takAcmeManager } from "./acme-manager.js";
import { ACME_SETTINGS_ID, encryptAcmeApiToken, loadTakAcmeSettings } from "./acme-settings.js";
import type { TakAcmeSettingsDto, UpdateTakAcmeSettingsRequest } from "./acme-settings.dto.js";
import { loadTakServerSettings } from "./tak-server-settings.js";

const EMAIL = /^[^\s@]+@[^\s@]+$/;
const CLOUDFLARE_ZONE_ID = /^[a-f0-9]{32}$/i;

function requireRecentUser(actor: ActorContext): void {
  if (actor.principal.type !== "user") {
    throw notFoundProblem();
  }
  requireRecentAuthentication(actor.principal);
}

function toDto(settings: TakAcmeSettings): TakAcmeSettingsDto {
  return {
    enabled: settings.enabled,
    email: settings.email,
    challengeType: settings.challengeType,
    provider: settings.provider,
    cloudflareZoneId: settings.cloudflareZoneId,
    apiTokenSet: settings.apiTokenEnvelope !== null,
    availableSolvers: ACME_SOLVERS.map((solver) => ({ ...solver })),
    running: takAcmeManager.running,
    lastAttemptAt: settings.lastAttemptAt?.toISOString() ?? null,
    lastSuccessAt: settings.lastSuccessAt?.toISOString() ?? null,
    lastError: settings.lastError,
    version: settings.version,
  };
}

export async function getTakAcmeSettings(principal: Principal): Promise<TakAcmeSettingsDto> {
  await requirePermission(principal, "tak-server.manage");
  return toDto(await loadTakAcmeSettings());
}

/** Let's Encrypt reaches an HTTP-01 challenge only through the reverse proxy of the Web address. */
export function httpChallengeHostProblem(takHostName: string, publicOrigin: string): ProblemFieldError | null {
  const webHostName = new URL(publicOrigin).hostname;
  if (takHostName.toLowerCase() === webHostName.toLowerCase()) {
    return null;
  }
  return {
    field: "challengeType",
    code: "HTTP_CHALLENGE_HOST_MISMATCH",
    message: `HTTP-01 works only when the TAK host name is the Web host name ${webHostName}. Use DNS-01 instead.`,
  };
}

async function problemsFor(input: UpdateTakAcmeSettingsRequest, current: TakAcmeSettings): Promise<ProblemFieldError[]> {
  const problems: ProblemFieldError[] = [];
  if (!isSupportedAcmeSolver(input.challengeType, input.provider)) {
    problems.push({
      field: "challengeType",
      code: "UNSUPPORTED_ACME_SOLVER",
      message: "Choose a challenge solver supported by this Core version.",
    });
  }
  if (input.email !== null && !EMAIL.test(input.email)) {
    problems.push({ field: "email", code: "INVALID_EMAIL", message: "Enter a valid ACME contact email." });
  }
  if (input.cloudflareZoneId !== null && !CLOUDFLARE_ZONE_ID.test(input.cloudflareZoneId)) {
    problems.push({ field: "cloudflareZoneId", code: "INVALID_ZONE_ID", message: "Use the 32-character Cloudflare zone ID." });
  }
  if (!input.enabled) {
    return problems;
  }
  const server = await loadTakServerSettings();
  if (server.hostName === null || /^\d+(?:\.\d+){3}$/.test(server.hostName)) {
    problems.push({ field: "hostName", code: "DNS_HOST_REQUIRED", message: "Let's Encrypt requires a configured DNS host name, not an IP address." });
  }
  if (input.email === null) {
    problems.push({ field: "email", code: "REQUIRED", message: "Required for ACME certificate issuance." });
  }
  if (input.challengeType === "http-01") {
    const mismatch = server.hostName === null ? null : httpChallengeHostProblem(server.hostName, config.publicOrigin);
    if (mismatch !== null) {
      problems.push(mismatch);
    }
    return problems;
  }
  if (input.cloudflareZoneId === null) {
    problems.push({ field: "cloudflareZoneId", code: "REQUIRED", message: "Required for the Cloudflare solver." });
  }
  const keepsToken = input.apiToken === undefined && current.apiTokenEnvelope !== null;
  if (!keepsToken && (input.apiToken === undefined || input.apiToken === null || input.apiToken.trim() === "")) {
    problems.push({ field: "apiToken", code: "REQUIRED", message: "A scoped Cloudflare API token is required." });
  }
  return problems;
}

/** Stores ACME configuration while preserving omitted write-only secrets. */
export async function updateTakAcmeSettings(
  actor: ActorContext,
  input: UpdateTakAcmeSettingsRequest,
): Promise<TakAcmeSettingsDto> {
  await requirePermission(actor.principal, "tak-server.manage");
  requireRecentUser(actor);
  const current = await loadTakAcmeSettings();
  const normalized = {
    ...input,
    email: input.email?.trim().toLowerCase() || null,
    challengeType: input.challengeType.trim().toLowerCase(),
    provider: input.provider.trim().toLowerCase(),
    cloudflareZoneId: input.cloudflareZoneId?.trim() || null,
  };
  const problems = await problemsFor(normalized, current);
  if (problems.length > 0) {
    throw validationProblem(problems);
  }

  const changes = {
    enabled: normalized.enabled,
    email: normalized.email,
    challengeType: normalized.challengeType,
    provider: normalized.provider,
    cloudflareZoneId: normalized.cloudflareZoneId,
    ...(normalized.apiToken === undefined
      ? {}
      : { apiTokenEnvelope: normalized.apiToken === null ? null : encryptAcmeApiToken(normalized.apiToken.trim()) }),
  };
  await database.$transaction(async (transaction) => {
    if (normalized.version === 0) {
      try {
        await transaction.takAcmeSettings.create({ data: { id: ACME_SETTINGS_ID, ...changes } });
      } catch (error: unknown) {
        throw isUniqueConstraintError(error) ? versionConflictProblem((await loadTakAcmeSettings()).version) : error;
      }
    } else {
      const updated = await transaction.takAcmeSettings.updateMany({
        where: { id: ACME_SETTINGS_ID, version: normalized.version },
        data: { ...changes, version: { increment: 1 } },
      });
      if (updated.count !== 1) {
        throw versionConflictProblem((await loadTakAcmeSettings()).version);
      }
    }
    await recordAudit(
      {
        actor: actor.principal,
        action: "tak-server.acme-settings-updated",
        targetType: "tak-acme-settings",
        targetId: ACME_SETTINGS_ID,
        result: "success",
        traceId: actor.traceId,
        metadata: {
          enabled: normalized.enabled,
          email: normalized.email,
          challengeType: normalized.challengeType,
          provider: normalized.provider,
          cloudflareZoneId: normalized.cloudflareZoneId,
          apiTokenChanged: normalized.apiToken !== undefined,
        },
      },
      transaction,
    );
  });

  if (normalized.enabled) {
    void takAcmeManager.ensureDue().catch(() => undefined);
  }
  return toDto(await loadTakAcmeSettings());
}

/** Forces a certificate order, e.g. after fixing DNS credentials. */
export async function renewTakAcmeCertificate(actor: ActorContext): Promise<TakAcmeSettingsDto> {
  await requirePermission(actor.principal, "tak-server.manage");
  requireRecentUser(actor);
  const settings = await loadTakAcmeSettings();
  if (!settings.enabled) {
    throw validationProblem([{ field: "enabled", code: "ACME_DISABLED", message: "Enable ACME automation first." }]);
  }
  try {
    await takAcmeManager.renewNow();
  } catch {
    const failed = await loadTakAcmeSettings();
    throw new ProblemError({
      type: "urn:openmeshtak:problem:acme-renewal-failed",
      title: "Certificate renewal failed",
      status: 502,
      detail: failed.lastError ?? "The ACME certificate could not be obtained.",
      code: "ACME_RENEWAL_FAILED",
    });
  }
  await recordAudit({
    actor: actor.principal,
    action: "tak-server.acme-renewal-requested",
    targetType: "tak-acme-settings",
    targetId: ACME_SETTINGS_ID,
    result: "success",
    traceId: actor.traceId,
  });
  return toDto(await loadTakAcmeSettings());
}

/** A manually uploaded certificate is an explicit choice and stops automatic replacement. */
export async function disableTakAcmeAutomation(): Promise<void> {
  await database.takAcmeSettings.updateMany({
    where: { id: ACME_SETTINGS_ID, enabled: true },
    data: { enabled: false, version: { increment: 1 } },
  });
}
