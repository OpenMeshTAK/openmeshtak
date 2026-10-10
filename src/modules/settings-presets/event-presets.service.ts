import { createHash } from "node:crypto";
import { recordAudit } from "../../shared/audit/audit.js";
import type { ActorContext, Principal } from "../../shared/auth/principal.js";
import { database } from "../../shared/database/database.js";
import { ProblemError, validationProblem, versionConflictProblem } from "../../shared/errors/problem-error.js";
import { requireMutableEvent, requireReadableEvent } from "../events/event-access.js";
import { loadMeshtasticConfiguration } from "../meshtastic-configuration/current-configuration.js";
import { resolveEventFirmware, type EventFirmware } from "../meshtastic-configuration/event-firmware.js";
import { secretFields, validateSettings } from "../meshtastic-configuration/firmware-settings.js";
import type { MeshtasticConfigurationDto } from "../meshtastic-configuration/meshtastic-configuration.dto.js";
import { getMeshtasticConfiguration, storeConfiguration } from "../meshtastic-configuration/meshtastic-configuration.service.js";
import { decryptSecretSettings } from "../meshtastic-configuration/secret-settings.js";
import { firmwareProfiles } from "../meshtastic-firmware/firmware-profiles.js";
import type { AtakPreferenceListDto } from "../tak-configuration/atak-preference-list.dto.js";
import {
  ATAK_CATALOG_VERSION,
  eventTargets,
  getAtakPreferences,
  loadAtakPreferenceEntries,
  saveList,
} from "../tak-configuration/atak-preference-list.service.js";
import { MAX_ENTRIES } from "../tak-configuration/atak-preferences.js";
import { planMeshtasticPreset, sameFirmwareLine } from "./meshtastic-preset.js";
import { meshtasticContentOf, parsePresetDocument, presetDocument, requireKind, takContentOf, type TakPresetContent } from "./preset-document.js";
import type {
  ApplyMeshtasticPresetRequest,
  ApplyTakPresetRequest,
  MeshtasticPresetPreviewDto,
  PresetDocumentDto,
  PresetTargetMappingDto,
  PreviewMeshtasticPresetRequest,
  PreviewTakPresetRequest,
  TakPresetPreviewDto,
} from "./settings-presets.dto.js";
import { mappingProblems, planTakPreset, refOf, type MappableTarget } from "./tak-preset.js";

/** Binds a confirmation to the event, the version it was computed on and the exact outcome. */
function confirmationToken(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(value)).digest("base64url");
}

function unconfirmedProblem(): ProblemError {
  return new ProblemError({
    type: "urn:openmeshtak:problem:preset-import-unconfirmed",
    title: "Preset import not confirmed",
    status: 409,
    detail: "Preview the import again and confirm exactly the changes it shows.",
    code: "PRESET_IMPORT_UNCONFIRMED",
  });
}

async function eventFirmwareOf(firmware: EventFirmware | null, firmwareVersion: string): Promise<EventFirmware> {
  if (firmware !== null) {
    return firmware;
  }
  const resolved = resolveEventFirmware(await firmwareProfiles(), firmwareVersion);
  if (!resolved.ok) {
    throw validationProblem([{ ...resolved.problem, field: "meshtastic.firmwareVersion" }]);
  }
  return resolved.firmware;
}

/** The event's Meshtastic settings without secrets, managed fields or member values. */
export async function exportMeshtasticPreset(principal: Principal, eventId: string): Promise<PresetDocumentDto> {
  const event = await requireReadableEvent(principal, eventId);
  const current = await loadMeshtasticConfiguration(database, eventId);
  return presetDocument(
    { kind: "meshtastic", name: `${event.name} – Meshtastic`, description: null, exportedFrom: "event" },
    { meshtastic: { firmwareVersion: current.firmwareVersion, settings: current.settings } },
  );
}

async function planMeshtasticImport(eventId: string, input: unknown) {
  const document = parsePresetDocument(input);
  requireKind(document, "meshtastic");
  const content = meshtasticContentOf(document);
  const current = await loadMeshtasticConfiguration(database, eventId);
  const firmware = await eventFirmwareOf(current.firmware, current.firmwareVersion);
  const plan = planMeshtasticPreset(firmware, current.settings, content.settings);
  const confirmation = confirmationToken({ eventId, version: current.version, settings: plan.settings });
  return { document, content, current, firmware, plan, confirmation };
}

export async function previewMeshtasticPreset(
  principal: Principal,
  eventId: string,
  input: PreviewMeshtasticPresetRequest,
): Promise<MeshtasticPresetPreviewDto> {
  await requireMutableEvent(principal, eventId, "meshtastic-settings.manage");
  const { content, current, firmware, plan, confirmation } = await planMeshtasticImport(eventId, input.document);
  const secrets = decryptSecretSettings(eventId, current.secretsEnvelope);
  return {
    version: current.version,
    presetFirmwareVersion: content.firmwareVersion,
    eventFirmwareVersion: current.firmwareVersion,
    sameFirmwareLine: sameFirmwareLine(content.firmwareVersion, current.firmwareVersion),
    changed: plan.changed,
    unchanged: plan.unchanged,
    invalid: plan.invalid,
    unsupported: plan.unsupported,
    notInPreset: plan.notInPreset,
    secretsKept: secretFields(firmware)
      .map(({ key }) => key)
      .filter((key) => Object.hasOwn(secrets, key)),
    confirmation,
  };
}

/**
 * Writes the previewed values into the event's Meshtastic draft. The firmware version and every
 * secret stay; nothing is published and no participant is re-provisioned.
 */
export async function applyMeshtasticPreset(
  actor: ActorContext,
  eventId: string,
  input: ApplyMeshtasticPresetRequest,
): Promise<MeshtasticConfigurationDto> {
  await requireMutableEvent(actor.principal, eventId, "meshtastic-settings.manage");
  const { document, current, firmware, plan, confirmation } = await planMeshtasticImport(eventId, input.document);
  if (current.version !== input.version) {
    throw versionConflictProblem(current.version);
  }
  if (input.confirmation !== confirmation) {
    throw unconfirmedProblem();
  }
  const { settings, problems } = validateSettings(firmware, plan.settings);
  if (problems.length > 0) {
    throw validationProblem(problems);
  }

  await database.$transaction(async (transaction) => {
    await storeConfiguration(transaction, eventId, input.version, { firmwareVersion: current.firmwareVersion, settings });
    await recordAudit(
      {
        actor: actor.principal,
        action: "settings-presets.meshtastic-imported",
        targetType: "event",
        targetId: eventId,
        result: "success",
        traceId: actor.traceId,
        metadata: {
          presetName: document.name,
          formatVersion: document.formatVersion,
          changedCount: plan.changed.length,
          invalidCount: plan.invalid.length,
          unsupportedCount: plan.unsupported.length,
        },
      },
      transaction,
    );
  });
  return getMeshtasticConfiguration(actor.principal, eventId);
}

async function mappableTargets(eventId: string): Promise<MappableTarget[]> {
  const [groups, roles] = await Promise.all([
    database.eventGroup.findMany({ where: { eventId }, select: { id: true, slug: true, name: true }, orderBy: { createdAt: "asc" } }),
    database.eventRole.findMany({ where: { eventId }, select: { id: true, slug: true, name: true }, orderBy: { createdAt: "asc" } }),
  ]);
  return [...groups.map((group) => ({ type: "group" as const, ...group })), ...roles.map((role) => ({ type: "role" as const, ...role }))];
}

/**
 * The event's portable ATAK preferences. Member-specific entries never leave the event, and group
 * and role entries name their target by slug so another event can map them explicitly.
 */
export async function exportTakPreset(principal: Principal, eventId: string): Promise<PresetDocumentDto> {
  const event = await requireReadableEvent(principal, eventId);
  const [entries, targets] = await Promise.all([loadAtakPreferenceEntries(database, eventId), mappableTargets(eventId)]);
  const byId = new Map(targets.map((target) => [`${target.type}:${target.id}`, target]));
  const atakPreferences = entries.flatMap((entry): TakPresetContent["atakPreferences"] => {
    const { target, preference, key, type, value } = entry;
    if (target.type === "event") {
      return [{ target: { type: "event" }, preference, key, type, value }];
    }
    const known = target.type === "member" ? undefined : byId.get(`${target.type}:${target.id}`);
    if (known === undefined) {
      return [];
    }
    return [{ target: { type: known.type, slug: known.slug, name: known.name }, preference, key, type, value }];
  });
  return presetDocument(
    { kind: "tak", name: `${event.name} – TAK`, description: null, exportedFrom: "event" },
    { tak: { atakVersion: ATAK_CATALOG_VERSION, atakPreferences } },
  );
}

async function planTakImport(eventId: string, input: unknown, mappingList: PresetTargetMappingDto[]) {
  const document = parsePresetDocument(input);
  requireKind(document, "tak");
  const content = takContentOf(document);
  const [targets, available, current, list] = await Promise.all([
    eventTargets(eventId),
    mappableTargets(eventId),
    loadAtakPreferenceEntries(database, eventId),
    database.atakPreferenceList.findUnique({ where: { eventId } }),
  ]);
  const problems = mappingProblems(mappingList, targets);
  if (problems.length > 0) {
    throw validationProblem(problems);
  }
  const mappings = new Map(mappingList.map((mapping) => [refOf(mapping), mapping.targetId]));
  const plan = planTakPreset(content, current, targets, available, mappings);
  const version = list?.version ?? 0;
  const confirmation = plan.complete ? confirmationToken({ eventId, version, entries: plan.entries }) : null;
  return { document, content, plan, version, confirmation };
}

export async function previewTakPreset(principal: Principal, eventId: string, input: PreviewTakPresetRequest): Promise<TakPresetPreviewDto> {
  await requireMutableEvent(principal, eventId, "tak-settings.manage");
  const { content, plan, version, confirmation } = await planTakImport(eventId, input.document, input.mappings ?? []);
  return {
    version,
    presetAtakVersion: content.atakVersion ?? null,
    catalogAtakVersion: ATAK_CATALOG_VERSION,
    targets: plan.targets,
    added: plan.added,
    changed: plan.changed,
    unchanged: plan.unchanged,
    invalid: plan.invalid,
    skipped: plan.skipped,
    confirmation,
  };
}

/**
 * Merges the previewed entries into the event's ATAK preference draft. Members receive them only
 * once an administrator publishes a configuration revision.
 */
export async function applyTakPreset(actor: ActorContext, eventId: string, input: ApplyTakPresetRequest): Promise<AtakPreferenceListDto> {
  await requireMutableEvent(actor.principal, eventId, "tak-settings.manage");
  const { document, plan, version, confirmation } = await planTakImport(eventId, input.document, input.mappings);
  if (version !== input.version) {
    throw versionConflictProblem(version);
  }
  if (!plan.complete) {
    throw validationProblem([{ field: "mappings", code: "MAPPING_REQUIRED", message: "Map every group and role of the preset, or leave it out." }]);
  }
  if (input.confirmation !== confirmation) {
    throw unconfirmedProblem();
  }
  if (plan.entries.length > MAX_ENTRIES) {
    throw validationProblem([
      { field: "document", code: "TOO_MANY_ENTRIES", message: `The list would hold more than ${String(MAX_ENTRIES)} entries.` },
    ]);
  }
  await saveList(actor, eventId, input.version, plan.entries, {
    action: "settings-presets.tak-imported",
    metadata: {
      presetName: document.name,
      formatVersion: document.formatVersion,
      addedCount: plan.added.length,
      changedCount: plan.changed.length,
      invalidCount: plan.invalid.length,
      skippedCount: plan.skipped,
    },
  });
  return getAtakPreferences(actor.principal, eventId);
}
