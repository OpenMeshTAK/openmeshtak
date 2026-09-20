import type { Prisma, TakConfiguration } from "../../generated/prisma/client.js";
import { recordAudit } from "../../shared/audit/audit.js";
import type { ActorContext, Principal } from "../../shared/auth/principal.js";
import { database } from "../../shared/database/database.js";
import { isUniqueConstraintError } from "../../shared/database/unique-constraint.js";
import { validationProblem, versionConflictProblem } from "../../shared/errors/problem-error.js";
import { requireMutableEvent, requireReadableEvent } from "../events/event-access.js";
import type {
  TakConfigurationDto,
  TakConnectionMode,
  UpdateTakConfigurationRequest,
} from "./tak-configuration.dto.js";

type TakClient = Pick<Prisma.TransactionClient, "takConfiguration">;

export interface CurrentTakConfiguration {
  mode: TakConnectionMode;
  meshChannelId: string | null;
}

/** Events without a stored row use no TAK connection guidance. */
export async function loadTakConfiguration(client: TakClient, eventId: string): Promise<CurrentTakConfiguration> {
  const row = await client.takConfiguration.findUnique({ where: { eventId } });
  return { mode: (row?.mode ?? "none") as TakConnectionMode, meshChannelId: row?.meshChannelId ?? null };
}

function toDto(eventId: string, row: TakConfiguration | null): TakConfigurationDto {
  return {
    eventId,
    mode: (row?.mode ?? "none") as TakConnectionMode,
    meshChannelId: row?.meshChannelId ?? null,
    version: row?.version ?? 0,
    updatedAt: row?.updatedAt.toISOString() ?? null,
  };
}

export async function getTakConfiguration(principal: Principal, eventId: string): Promise<TakConfigurationDto> {
  await requireReadableEvent(principal, eventId);
  return toDto(eventId, await database.takConfiguration.findUnique({ where: { eventId } }));
}

/** The mesh channel only matters for the Meshtastic local server and must belong to the event. */
async function validatedChannel(eventId: string, input: UpdateTakConfigurationRequest): Promise<string | null> {
  if (input.mode !== "meshtastic-local-server" || input.meshChannelId === null) {
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

/** Changes reach participants through the next published configuration revision. */
export async function updateTakConfiguration(
  actor: ActorContext,
  eventId: string,
  input: UpdateTakConfigurationRequest,
): Promise<TakConfigurationDto> {
  await requireMutableEvent(actor.principal, eventId);
  const meshChannelId = await validatedChannel(eventId, input);
  const data = { mode: input.mode, meshChannelId };

  await database.$transaction(async (transaction) => {
    if (input.version === 0) {
      try {
        await transaction.takConfiguration.create({ data: { eventId, ...data } });
      } catch (error: unknown) {
        if (!isUniqueConstraintError(error)) {
          throw error;
        }
        const latest = await transaction.takConfiguration.findUnique({ where: { eventId } });
        throw versionConflictProblem(latest?.version ?? 0);
      }
    } else {
      const updated = await transaction.takConfiguration.updateMany({
        where: { eventId, version: input.version },
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
        action: "tak-configuration.updated",
        targetType: "event",
        targetId: eventId,
        result: "success",
        traceId: actor.traceId,
        metadata: { mode: input.mode, meshChannelId },
      },
      transaction,
    );
  });
  return toDto(eventId, await database.takConfiguration.findUnique({ where: { eventId } }));
}
