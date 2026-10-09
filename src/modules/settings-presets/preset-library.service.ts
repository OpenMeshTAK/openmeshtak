import { randomUUID } from "node:crypto";
import type { Prisma, SettingsPreset } from "../../generated/prisma/client.js";
import { recordAudit } from "../../shared/audit/audit.js";
import { eventAccessFor, forbidden, requirePermission } from "../../shared/auth/permission-check.js";
import type { ActorContext, Principal } from "../../shared/auth/principal.js";
import { database } from "../../shared/database/database.js";
import { notFoundProblem, validationProblem, versionConflictProblem } from "../../shared/errors/problem-error.js";
import { afterCursor, CURSOR_ORDER, decodeCursor, DEFAULT_PAGE_LIMIT, toPage } from "../../shared/pagination/cursor.js";
import { resolveEventFirmware } from "../meshtastic-configuration/event-firmware.js";
import { firmwareProfiles } from "../meshtastic-firmware/firmware-profiles.js";
import { libraryMeshtasticProblems } from "./meshtastic-preset.js";
import { parsePresetDocument, presetDocument, type MeshtasticPresetContent, type PresetDocument, type TakPresetContent } from "./preset-document.js";
import type {
  CreateSettingsPresetRequest,
  PresetKind,
  SettingsPresetDto,
  SettingsPresetPage,
  SettingsPresetSummaryDto,
  UpdateSettingsPresetRequest,
} from "./settings-presets.dto.js";
import { libraryTakProblems } from "./tak-preset.js";

type StoredContent = MeshtasticPresetContent | TakPresetContent;

function isMeshtastic(row: Pick<SettingsPreset, "kind">, content: StoredContent): content is MeshtasticPresetContent {
  return row.kind === "meshtastic" && "settings" in content;
}

function toSummary(row: SettingsPreset): SettingsPresetSummaryDto {
  const content = row.content as unknown as StoredContent;
  const meshtastic = isMeshtastic(row, content);
  return {
    id: row.id,
    kind: row.kind,
    name: row.name,
    description: row.description,
    targetVersion: meshtastic ? content.firmwareVersion : (content.atakVersion ?? null),
    itemCount: meshtastic ? Object.keys(content.settings).length : content.atakPreferences.length,
    version: row.version,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function toDto(row: SettingsPreset): SettingsPresetDto {
  const content = row.content as unknown as StoredContent;
  const fields = { kind: row.kind, name: row.name, description: row.description, exportedFrom: "library" as const };
  const document = isMeshtastic(row, content)
    ? presetDocument(fields, { meshtastic: content })
    : presetDocument(fields, { tak: content });
  return { ...toSummary(row), document };
}

/** Anyone who may change some event's settings may browse and apply library presets. */
async function requireLibraryReader(principal: Principal): Promise<void> {
  const access = await eventAccessFor(principal, "events.manage");
  if (!access.all && access.eventIds.length === 0) {
    throw forbidden();
  }
}

/** The library is shared by every event, so only instance-wide event managers may change it. */
async function requireLibraryWriter(principal: Principal): Promise<void> {
  await requirePermission(principal, "events.manage");
}

/** Validates a document for the library, independent of any event, and returns what is stored. */
async function libraryContent(document: PresetDocument): Promise<StoredContent> {
  if (document.kind === "meshtastic" && document.meshtastic !== undefined) {
    const resolved = resolveEventFirmware(await firmwareProfiles(), document.meshtastic.firmwareVersion);
    if (!resolved.ok) {
      throw validationProblem([{ ...resolved.problem, field: "document.meshtastic.firmwareVersion" }]);
    }
    const problems = libraryMeshtasticProblems(resolved.firmware, document.meshtastic.settings);
    if (problems.length > 0) {
      throw validationProblem(problems);
    }
    return { firmwareVersion: resolved.firmware.recommended, settings: document.meshtastic.settings };
  }
  if (document.kind === "tak" && document.tak !== undefined) {
    const problems = libraryTakProblems(document.tak);
    if (problems.length > 0) {
      throw validationProblem(problems);
    }
    return document.tak;
  }
  throw validationProblem([{ field: "document.kind", code: "INVALID_PRESET", message: "The preset has no settings section." }]);
}

function listContext(kind: PresetKind | undefined): string {
  return `settings-presets:${kind ?? "all"}`;
}

export async function listSettingsPresets(
  principal: Principal,
  kind?: PresetKind,
  limit = DEFAULT_PAGE_LIMIT,
  cursor?: string,
): Promise<SettingsPresetPage> {
  await requireLibraryReader(principal);
  const context = listContext(kind);
  const position = cursor === undefined ? null : decodeCursor(context, cursor);
  const rows = await database.settingsPreset.findMany({
    where: { ...(kind === undefined ? {} : { kind }), ...afterCursor(position) },
    orderBy: [...CURSOR_ORDER],
    take: limit + 1,
  });
  return toPage(context, rows, limit, toSummary);
}

async function findPreset(id: string): Promise<SettingsPreset> {
  const row = await database.settingsPreset.findUnique({ where: { id } });
  if (row === null) {
    throw notFoundProblem();
  }
  return row;
}

export async function getSettingsPreset(principal: Principal, id: string): Promise<SettingsPresetDto> {
  await requireLibraryReader(principal);
  return toDto(await findPreset(id));
}

async function audit(actor: ActorContext, action: string, row: Pick<SettingsPreset, "id" | "kind">, transaction?: Prisma.TransactionClient) {
  await recordAudit(
    {
      actor: actor.principal,
      action,
      targetType: "settings-preset",
      targetId: row.id,
      result: "success",
      traceId: actor.traceId,
      metadata: { kind: row.kind },
    },
    transaction,
  );
}

/** Saves a copy of a preset to the library. Events that later use it get their own copy. */
export async function createSettingsPreset(actor: ActorContext, input: CreateSettingsPresetRequest): Promise<SettingsPresetDto> {
  await requireLibraryWriter(actor.principal);
  const document = parsePresetDocument(input.document);
  const content = await libraryContent(document);
  const name = (input.name ?? document.name).trim();
  if (name === "") {
    throw validationProblem([{ field: "name", code: "INVALID_VALUE", message: "Enter a name." }]);
  }
  const row = await database.$transaction(async (transaction) => {
    const created = await transaction.settingsPreset.create({
      data: {
        id: randomUUID(),
        kind: document.kind,
        name,
        description: input.description === undefined ? (document.description ?? null) : input.description,
        content,
      },
    });
    await audit(actor, "settings-presets.created", created, transaction);
    return created;
  });
  return toDto(row);
}

/**
 * Renames a library preset or replaces its settings. Events that already used it keep their own
 * values and published artifacts; nothing is pushed to them.
 */
export async function updateSettingsPreset(actor: ActorContext, id: string, input: UpdateSettingsPresetRequest): Promise<SettingsPresetDto> {
  await requireLibraryWriter(actor.principal);
  const existing = await findPreset(id);
  const name = input.name.trim();
  if (name === "") {
    throw validationProblem([{ field: "name", code: "INVALID_VALUE", message: "Enter a name." }]);
  }
  let content: StoredContent | undefined;
  if (input.document !== undefined) {
    const document = parsePresetDocument(input.document);
    if (document.kind !== existing.kind) {
      throw validationProblem([{ field: "document.kind", code: "WRONG_PRESET_KIND", message: "A preset keeps its kind." }]);
    }
    content = await libraryContent(document);
  }
  const row = await database.$transaction(async (transaction) => {
    const updated = await transaction.settingsPreset.updateMany({
      where: { id, version: input.version },
      data: {
        name,
        description: input.description,
        ...(content === undefined ? {} : { content }),
        version: { increment: 1 },
      },
    });
    if (updated.count !== 1) {
      const latest = await transaction.settingsPreset.findUnique({ where: { id } });
      if (latest === null) {
        throw notFoundProblem();
      }
      throw versionConflictProblem(latest.version);
    }
    await audit(actor, "settings-presets.updated", existing, transaction);
    return transaction.settingsPreset.findUniqueOrThrow({ where: { id } });
  });
  return toDto(row);
}

export async function deleteSettingsPreset(actor: ActorContext, id: string): Promise<void> {
  await requireLibraryWriter(actor.principal);
  const existing = await findPreset(id);
  await database.$transaction(async (transaction) => {
    await transaction.settingsPreset.delete({ where: { id } });
    await audit(actor, "settings-presets.deleted", existing, transaction);
  });
}
