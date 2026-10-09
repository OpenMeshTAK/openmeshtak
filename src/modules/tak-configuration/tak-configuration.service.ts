import type { Prisma, TakConfiguration } from "../../generated/prisma/client.js";
import { recordAudit } from "../../shared/audit/audit.js";
import type { ActorContext, Principal } from "../../shared/auth/principal.js";
import { database } from "../../shared/database/database.js";
import { isUniqueConstraintError } from "../../shared/database/unique-constraint.js";
import { validationProblem, versionConflictProblem } from "../../shared/errors/problem-error.js";
import { requireMutableEvent, requireReadableEvent } from "../events/event-access.js";
import {
  effectiveAtakPreferences,
  parseAtakPreferenceFile,
  readAtakSettings,
  validateAtakSettings,
  type AtakPreference,
} from "./atak-preferences.js";
import type {
  TakConfigurationDto,
  UpdateAtakPreferenceFileRequest,
  UpdateAtakPreferenceFileResponse,
  UpdateTakConfigurationRequest,
} from "./tak-configuration.dto.js";

type TakClient = Pick<Prisma.TransactionClient, "takConfiguration">;

export interface CurrentTakConfiguration {
  meshChannelId: string | null;
  /** The preferences members' ATAK receives: the uploaded file with the form's choices on top. */
  atakPreferences: AtakPreference[];
}

function fileEntriesOf(row: TakConfiguration | null): AtakPreference[] {
  // Written only by `updateAtakPreferenceFile` from parsed, cleaned entries.
  return (row?.atakPreferenceEntries ?? []) as unknown as AtakPreference[];
}

export async function loadTakConfiguration(client: TakClient, eventId: string): Promise<CurrentTakConfiguration> {
  const row = await client.takConfiguration.findUnique({ where: { eventId } });
  return {
    meshChannelId: row?.meshChannelId ?? null,
    atakPreferences: effectiveAtakPreferences(fileEntriesOf(row), readAtakSettings(row?.atakSettings)),
  };
}

function toDto(eventId: string, row: TakConfiguration | null): TakConfigurationDto {
  return {
    eventId,
    meshChannelId: row?.meshChannelId ?? null,
    atakSettings: readAtakSettings(row?.atakSettings),
    atakPreferenceFile:
      row?.atakPreferenceFileName === null || row?.atakPreferenceFileName === undefined
        ? null
        : { fileName: row.atakPreferenceFileName, entries: fileEntriesOf(row) },
    version: row?.version ?? 0,
    updatedAt: row?.updatedAt.toISOString() ?? null,
  };
}

export async function getTakConfiguration(principal: Principal, eventId: string): Promise<TakConfigurationDto> {
  await requireReadableEvent(principal, eventId);
  return toDto(eventId, await database.takConfiguration.findUnique({ where: { eventId } }));
}

/** The mesh channel must belong to the event. */
async function validatedChannel(eventId: string, input: UpdateTakConfigurationRequest): Promise<string | null> {
  if (input.meshChannelId === null) {
    return null;
  }
  const channel = await database.meshtasticChannel.findFirst({
    where: { id: input.meshChannelId, eventId },
    select: { id: true },
  });
  if (channel === null) {
    throw validationProblem([
      { field: "meshChannelId", code: "UNKNOWN_REFERENCE", message: "Choose a channel of this event." },
    ]);
  }
  return channel.id;
}

/** Creates or updates the row with optimistic concurrency and audits the change. */
async function saveVersioned(
  actor: ActorContext,
  eventId: string,
  version: number,
  data: Prisma.TakConfigurationUncheckedUpdateInput,
  audit: { action: string; metadata: Prisma.InputJsonObject },
): Promise<TakConfigurationDto> {
  await database.$transaction(async (transaction) => {
    if (version === 0) {
      try {
        await transaction.takConfiguration.create({ data: { ...(data as Prisma.TakConfigurationUncheckedCreateInput), eventId } });
      } catch (error: unknown) {
        if (!isUniqueConstraintError(error)) {
          throw error;
        }
        const latest = await transaction.takConfiguration.findUnique({ where: { eventId } });
        throw versionConflictProblem(latest?.version ?? 0);
      }
    } else {
      const updated = await transaction.takConfiguration.updateMany({
        where: { eventId, version },
        data: { ...data, version: { increment: 1 } },
      });
      if (updated.count !== 1) {
        const latest = await transaction.takConfiguration.findUnique({ where: { eventId } });
        throw versionConflictProblem(latest?.version ?? 0);
      }
    }
    await recordAudit(
      {
        actor: actor.principal,
        action: audit.action,
        targetType: "event",
        targetId: eventId,
        result: "success",
        traceId: actor.traceId,
        metadata: audit.metadata,
      },
      transaction,
    );
  });
  return toDto(eventId, await database.takConfiguration.findUnique({ where: { eventId } }));
}

/** Changes reach participants through the next published configuration revision. */
export async function updateTakConfiguration(
  actor: ActorContext,
  eventId: string,
  input: UpdateTakConfigurationRequest,
): Promise<TakConfigurationDto> {
  await requireMutableEvent(actor.principal, eventId);
  const meshChannelId = await validatedChannel(eventId, input);
  const data: Prisma.TakConfigurationUncheckedUpdateInput = { meshChannelId };
  if (input.atakSettings !== undefined) {
    validateAtakSettings(input.atakSettings);
    data.atakSettings = { ...input.atakSettings };
  }
  return saveVersioned(actor, eventId, input.version, data, {
    action: "tak-configuration.updated",
    metadata: { meshChannelId, atakSettingsChanged: input.atakSettings !== undefined },
  });
}

/**
 * Stores or removes the event's ATAK preference file. Keys OpenMeshTak owns, such as the server
 * connection, certificates, passwords, callsign, team and role, are removed and reported. Values
 * are not audited, because a file may contain anything the administrator's ATAK had set.
 */
export async function updateAtakPreferenceFile(
  actor: ActorContext,
  eventId: string,
  input: UpdateAtakPreferenceFileRequest,
): Promise<UpdateAtakPreferenceFileResponse> {
  await requireMutableEvent(actor.principal, eventId);
  if (input.file === null) {
    const configuration = await saveVersioned(
      actor,
      eventId,
      input.version,
      { atakPreferenceFileName: null, atakPreferenceEntries: [] },
      { action: "tak-configuration.atak-preferences-removed", metadata: {} },
    );
    return { configuration, removedKeys: [] };
  }
  const { entries, removedKeys } = parseAtakPreferenceFile(input.file.content);
  const configuration = await saveVersioned(
    actor,
    eventId,
    input.version,
    { atakPreferenceFileName: input.file.fileName, atakPreferenceEntries: entries as unknown as Prisma.InputJsonArray },
    { action: "tak-configuration.atak-preferences-uploaded", metadata: { entryCount: entries.length, removedCount: removedKeys.length } },
  );
  return { configuration, removedKeys };
}
