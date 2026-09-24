import { createHash } from "node:crypto";
import type { Prisma } from "../../generated/prisma/client.js";
import { recordAudit } from "../../shared/audit/audit.js";
import type { ActorContext, Principal } from "../../shared/auth/principal.js";
import { database } from "../../shared/database/database.js";
import { isUniqueConstraintError } from "../../shared/database/unique-constraint.js";
import {
  ProblemError,
  validationProblem,
  versionConflictProblem,
} from "../../shared/errors/problem-error.js";
import { requireMutableEvent, requireReadableEvent } from "../events/event-access.js";
import { firmwareProfiles } from "../meshtastic-firmware/firmware-profiles.js";
import { formatFirmwareVersion, lineOf, parseFirmwareVersion } from "../meshtastic-firmware/firmware-version.js";
import { loadMeshtasticConfiguration, type CurrentMeshtasticConfiguration } from "./current-configuration.js";
import { isVerified, resolveEventFirmware, type EventFirmware } from "./event-firmware.js";
import {
  applySecretChanges,
  keepSecretsFor,
  planFirmwareChange,
  secretFields,
  validateSettings,
  type FirmwareChangeReport,
  type FirmwareSettings,
} from "./firmware-settings.js";
import { decryptSecretSettings, encryptSecretSettings } from "./secret-settings.js";
import type {
  ChangeFirmwareRequest,
  FirmwareChangePreviewDto,
  MeshtasticConfigurationDto,
  PreviewFirmwareChangeRequest,
  UpdateMeshtasticSecretsRequest,
  UpdateMeshtasticSettingsRequest,
} from "./meshtastic-configuration.dto.js";

/** Only which secrets are set leaves this module, never their values. */
function setSecretKeys(eventId: string, current: CurrentMeshtasticConfiguration): string[] {
  if (current.firmware === null) {
    return [];
  }
  const secrets = decryptSecretSettings(eventId, current.secretsEnvelope);
  return secretFields(current.firmware)
    .map(({ key }) => key)
    .filter((key) => Object.hasOwn(secrets, key));
}

function toDto(eventId: string, current: CurrentMeshtasticConfiguration): MeshtasticConfigurationDto {
  const { firmware } = current;
  return {
    eventId,
    firmwareVersion: current.firmwareVersion,
    effectiveMinimumVersion: firmware === null ? null : formatFirmwareVersion(firmware.effectiveMinimum),
    profileId: firmware?.profile.file.id ?? null,
    verified: firmware !== null && isVerified(firmware),
    settings: current.settings,
    secretFields: firmware === null ? [] : secretFields(firmware).map(({ key }) => key),
    secretsSet: setSecretKeys(eventId, current),
    problems: current.problems,
    version: current.version,
    updatedAt: current.updatedAt?.toISOString() ?? null,
  };
}

async function resolveOrReject(firmwareVersion: string): Promise<EventFirmware> {
  const resolved = resolveEventFirmware(await firmwareProfiles(), firmwareVersion);
  if (!resolved.ok) {
    throw validationProblem([resolved.problem]);
  }
  return resolved.firmware;
}

/**
 * Writes the whole configuration with optimistic concurrency. Version 0 means "never saved", so
 * the first write creates the row and a concurrent first write loses on the primary key.
 */
async function storeConfiguration(
  transaction: Prisma.TransactionClient,
  eventId: string,
  expectedVersion: number,
  data: { firmwareVersion: string; settings: FirmwareSettings; secretsEnvelope?: string | null },
): Promise<void> {
  if (expectedVersion === 0) {
    try {
      await transaction.meshtasticConfiguration.create({ data: { eventId, ...data } });
      return;
    } catch (error: unknown) {
      if (!isUniqueConstraintError(error)) {
        throw error;
      }
    }
  } else {
    const updated = await transaction.meshtasticConfiguration.updateMany({
      where: { eventId, version: expectedVersion },
      data: { ...data, version: { increment: 1 } },
    });
    if (updated.count === 1) {
      return;
    }
  }
  const latest = await transaction.meshtasticConfiguration.findUnique({ where: { eventId } });
  throw versionConflictProblem(latest?.version ?? 0);
}

export async function getMeshtasticConfiguration(
  principal: Principal,
  eventId: string,
): Promise<MeshtasticConfigurationDto> {
  await requireReadableEvent(principal, eventId);
  return toDto(eventId, await loadMeshtasticConfiguration(database, eventId));
}

export async function updateMeshtasticSettings(
  actor: ActorContext,
  eventId: string,
  input: UpdateMeshtasticSettingsRequest,
): Promise<MeshtasticConfigurationDto> {
  await requireMutableEvent(actor.principal, eventId);
  const current = await loadMeshtasticConfiguration(database, eventId);
  if (current.version !== input.version) {
    throw versionConflictProblem(current.version);
  }
  const firmware = current.firmware ?? (await resolveOrReject(current.firmwareVersion));
  const { settings, problems } = validateSettings(firmware, input.settings);
  if (problems.length > 0) {
    throw validationProblem(problems);
  }

  await database.$transaction(async (transaction) => {
    await storeConfiguration(transaction, eventId, input.version, {
      firmwareVersion: current.firmwareVersion,
      settings,
    });
    await recordAudit(
      {
        actor: actor.principal,
        action: "meshtastic-configuration.settings-updated",
        targetType: "event",
        targetId: eventId,
        result: "success",
        traceId: actor.traceId,
        metadata: { firmwareVersion: current.firmwareVersion },
      },
      transaction,
    );
  });
  return toDto(eventId, await loadMeshtasticConfiguration(database, eventId));
}

/**
 * Sets or clears write-only secrets such as the Wi-Fi password. Values are encrypted at rest,
 * never returned and only written into members' own device profiles; the audit records keys only.
 */
export async function updateMeshtasticSecrets(
  actor: ActorContext,
  eventId: string,
  input: UpdateMeshtasticSecretsRequest,
): Promise<MeshtasticConfigurationDto> {
  await requireMutableEvent(actor.principal, eventId);
  const current = await loadMeshtasticConfiguration(database, eventId);
  if (current.version !== input.version) {
    throw versionConflictProblem(current.version);
  }
  const firmware = current.firmware ?? (await resolveOrReject(current.firmwareVersion));
  const { secrets, problems } = applySecretChanges(
    firmware,
    decryptSecretSettings(eventId, current.secretsEnvelope),
    input.secrets,
  );
  if (problems.length > 0) {
    throw validationProblem(problems);
  }

  const changed = Object.keys(input.secrets);
  await database.$transaction(async (transaction) => {
    await storeConfiguration(transaction, eventId, input.version, {
      firmwareVersion: current.firmwareVersion,
      settings: current.settings,
      secretsEnvelope: encryptSecretSettings(eventId, secrets),
    });
    await recordAudit(
      {
        actor: actor.principal,
        action: "meshtastic-configuration.secrets-updated",
        targetType: "event",
        targetId: eventId,
        result: "success",
        traceId: actor.traceId,
        metadata: {
          set: changed.filter((key) => input.secrets[key] !== null),
          cleared: changed.filter((key) => input.secrets[key] === null),
        },
      },
      transaction,
    );
  });
  return toDto(eventId, await loadMeshtasticConfiguration(database, eventId));
}

/** Raising only the minimum patch within a line adds fields and never drops a value. */
function needsConfirmation(from: string, to: string): boolean {
  const before = parseFirmwareVersion(from);
  const after = parseFirmwareVersion(to);
  if (before === null || after === null || lineOf(before) !== lineOf(after)) {
    return true;
  }
  return (after.patch ?? 0) < (before.patch ?? 0);
}

/** Binds a confirmation to the exact configuration version, target and report it was shown. */
function confirmationToken(
  eventId: string,
  version: number,
  target: string,
  report: FirmwareChangeReport,
): string {
  return createHash("sha256")
    .update(JSON.stringify({ eventId, version, target, report }))
    .digest("base64url");
}

async function planChange(eventId: string, firmwareVersion: string) {
  const current = await loadMeshtasticConfiguration(database, eventId);
  const next = await resolveOrReject(firmwareVersion);
  const planned = planFirmwareChange(current.settings, next);
  const kept = keepSecretsFor(next, decryptSecretSettings(eventId, current.secretsEnvelope));
  const settings = planned.settings;
  const report = { ...planned.report, dropped: [...planned.report.dropped, ...kept.dropped] };
  const secretsEnvelope = encryptSecretSettings(eventId, kept.secrets);
  const confirmation = needsConfirmation(current.firmwareVersion, next.recommended)
    ? confirmationToken(eventId, current.version, next.recommended, report)
    : null;
  return { current, next, report, settings, secretsEnvelope, confirmation };
}

export async function previewFirmwareChange(
  principal: Principal,
  eventId: string,
  input: PreviewFirmwareChangeRequest,
): Promise<FirmwareChangePreviewDto> {
  await requireMutableEvent(principal, eventId);
  const { next, report, confirmation } = await planChange(eventId, input.firmwareVersion);
  return {
    firmwareVersion: next.recommended,
    effectiveMinimumVersion: formatFirmwareVersion(next.effectiveMinimum),
    profileId: next.profile.file.id,
    report,
    confirmation,
  };
}

function unconfirmedProblem(): ProblemError {
  return new ProblemError({
    type: "urn:openmeshtak:problem:firmware-change-unconfirmed",
    title: "Firmware change not confirmed",
    status: 409,
    detail: "Preview this firmware change and confirm exactly the report it returns.",
    code: "FIRMWARE_CHANGE_UNCONFIRMED",
  });
}

/**
 * Applies a firmware change. Kept values stay, invalid values fall back to the new default,
 * dropped values are removed and new fields get defaults, exactly as the preview reported.
 */
export async function changeFirmware(
  actor: ActorContext,
  eventId: string,
  input: ChangeFirmwareRequest,
): Promise<MeshtasticConfigurationDto> {
  await requireMutableEvent(actor.principal, eventId);
  const { current, next, report, settings, secretsEnvelope, confirmation } = await planChange(
    eventId,
    input.firmwareVersion,
  );
  if (current.version !== input.version) {
    throw versionConflictProblem(current.version);
  }
  if (confirmation !== null && input.confirmation !== confirmation) {
    throw unconfirmedProblem();
  }

  await database.$transaction(async (transaction) => {
    await storeConfiguration(transaction, eventId, input.version, {
      firmwareVersion: next.recommended,
      settings,
      secretsEnvelope,
    });
    await recordAudit(
      {
        actor: actor.principal,
        action: "meshtastic-configuration.firmware-changed",
        targetType: "event",
        targetId: eventId,
        result: "success",
        traceId: actor.traceId,
        metadata: {
          from: current.firmwareVersion,
          to: next.recommended,
          dropped: report.dropped,
          invalid: report.invalid,
        },
      },
      transaction,
    );
  });
  return toDto(eventId, await loadMeshtasticConfiguration(database, eventId));
}
