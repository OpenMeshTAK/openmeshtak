import { randomUUID } from "node:crypto";
import type {
  MeshtasticChannel,
  MeshtasticChannelAudience,
  Prisma,
} from "../../generated/prisma/client.js";
import { recordAudit, type AuditEntry } from "../../shared/audit/audit.js";
import type { ActorContext, Principal } from "../../shared/auth/principal.js";
import { database } from "../../shared/database/database.js";
import { isUniqueConstraintError } from "../../shared/database/unique-constraint.js";
import {
  notFoundProblem,
  ProblemError,
  validationProblem,
  versionConflictProblem,
} from "../../shared/errors/problem-error.js";
import {
  afterCursor,
  CURSOR_ORDER,
  DEFAULT_PAGE_LIMIT,
  decodeCursor,
  toPage,
} from "../../shared/pagination/cursor.js";
import { MESHTASTIC_MAX_CHANNELS } from "../event-groups/provisioning-values.js";
import {
  requireEventPermission,
  requireMutableEvent,
  requireReadableEvent,
} from "../events/event-access.js";
import { audienceRows, EMPTY_AUDIENCE, toAudience, validateAudience } from "./channel-audience.js";
import { CHANNEL_DEVICE_ORDER } from "./channel-order.js";
import { decryptChannelPsk, encryptChannelPsk, parseOrGeneratePsk, pskKind } from "./channel-psk.js";
import { secrecyProblems } from "./channel-secrecy.js";
import type {
  ChannelAudience,
  CreateMeshtasticChannelRequest,
  MeshtasticChannelDto,
  MeshtasticChannelPage,
  ReleaseMeshtasticChannelRequest,
  RevealedChannelPsk,
  RotateChannelPskRequest,
  UpdateMeshtasticChannelRequest,
} from "./meshtastic-channel.dto.js";

type ChannelRow = MeshtasticChannel & { audience: MeshtasticChannelAudience[] };

/** The primary channel is the lowest `sortOrder`, with creation order breaking ties. */
async function primaryChannelId(eventId: string): Promise<string | null> {
  const primary = await database.meshtasticChannel.findFirst({
    where: { eventId },
    orderBy: [...CHANNEL_DEVICE_ORDER],
    select: { id: true },
  });
  return primary?.id ?? null;
}

function toDto(row: ChannelRow, primaryId: string | null): MeshtasticChannelDto {
  return {
    id: row.id,
    eventId: row.eventId,
    name: row.name,
    sortOrder: row.sortOrder,
    primary: row.id === primaryId,
    psk: {
      kind: pskKind(row.pskBytes),
      version: row.pskVersion,
      rotatedAt: row.pskRotatedAt?.toISOString() ?? null,
    },
    uplinkEnabled: row.uplinkEnabled,
    downlinkEnabled: row.downlinkEnabled,
    positionPrecision: row.positionPrecision,
    audience: toAudience(row.audience),
    secret: row.secret,
    releasedAt: row.releasedAt?.toISOString() ?? null,
    keyHolders: toAudience(row.audience, true),
    version: row.version,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

async function findChannel(eventId: string, channelId: string): Promise<ChannelRow> {
  const row = await database.meshtasticChannel.findFirst({
    where: { id: channelId, eventId },
    include: { audience: true },
  });
  if (row === null) {
    throw notFoundProblem();
  }
  return row;
}

async function channelDto(eventId: string, channelId: string): Promise<MeshtasticChannelDto> {
  return toDto(await findChannel(eventId, channelId), await primaryChannelId(eventId));
}

function nameConflict(error: unknown): unknown {
  return isUniqueConstraintError(error)
    ? new ProblemError({
        type: "urn:openmeshtak:problem:channel-name-conflict",
        title: "Channel name already in use",
        status: 409,
        detail: "Another channel of this event already uses this name.",
        code: "CHANNEL_NAME_CONFLICT",
      })
    : error;
}

async function validateChannelInput(
  eventId: string,
  input: { secret: boolean; audience: ChannelAudience; keyHolders: ChannelAudience },
  pskBytes: number,
): Promise<void> {
  const problems = secrecyProblems(input.secret, input.keyHolders, pskBytes);
  if (problems.length > 0) {
    throw validationProblem(problems);
  }
  await validateAudience(eventId, input.audience);
  await validateAudience(eventId, input.keyHolders, "keyHolders");
}

async function replaceSelectors(
  transaction: Prisma.TransactionClient,
  channelId: string,
  input: { audience: ChannelAudience; keyHolders: ChannelAudience },
): Promise<void> {
  await transaction.meshtasticChannelAudience.deleteMany({ where: { channelId } });
  await transaction.meshtasticChannelAudience.createMany({
    data: [
      ...audienceRows(channelId, input.audience),
      ...audienceRows(channelId, input.keyHolders, true),
    ],
  });
}

function channelLimitProblem(): ProblemError {
  return new ProblemError({
    type: "urn:openmeshtak:problem:channel-limit-reached",
    title: "Channel limit reached",
    status: 409,
    detail: `Meshtastic devices hold at most ${String(MESHTASTIC_MAX_CHANNELS)} channels.`,
    code: "CHANNEL_LIMIT_REACHED",
  });
}

/** Audit entries name the channel but never contain key material. */
function audit(
  actor: ActorContext,
  action: string,
  row: Pick<MeshtasticChannel, "id" | "eventId" | "name">,
  metadata: Record<string, unknown> = {},
): AuditEntry {
  return {
    actor: actor.principal,
    action,
    targetType: "meshtastic-channel",
    targetId: row.id,
    result: "success",
    traceId: actor.traceId,
    metadata: { eventId: row.eventId, name: row.name, ...metadata },
  };
}

export async function listMeshtasticChannels(
  principal: Principal,
  eventId: string,
  limit = DEFAULT_PAGE_LIMIT,
  cursor?: string,
): Promise<MeshtasticChannelPage> {
  await requireReadableEvent(principal, eventId);
  const context = `events/${eventId}/meshtastic/channels`;
  const position = cursor === undefined ? null : decodeCursor(context, cursor);

  const [rows, primaryId] = await Promise.all([
    database.meshtasticChannel.findMany({
      where: { eventId, ...afterCursor(position) },
      orderBy: [...CURSOR_ORDER],
      take: limit + 1,
      include: { audience: true },
    }),
    primaryChannelId(eventId),
  ]);
  return toPage(context, rows, limit, (row) => toDto(row, primaryId));
}

export async function getMeshtasticChannel(
  principal: Principal,
  eventId: string,
  channelId: string,
): Promise<MeshtasticChannelDto> {
  await requireReadableEvent(principal, eventId);
  return channelDto(eventId, channelId);
}

export async function createMeshtasticChannel(
  actor: ActorContext,
  eventId: string,
  input: CreateMeshtasticChannelRequest,
): Promise<MeshtasticChannelDto> {
  await requireMutableEvent(actor.principal, eventId);
  const psk = parseOrGeneratePsk(input.psk);
  const selection = {
    secret: input.secret ?? false,
    audience: input.audience ?? EMPTY_AUDIENCE,
    keyHolders: input.keyHolders ?? EMPTY_AUDIENCE,
  };
  await validateChannelInput(eventId, selection, psk.length);
  const id = randomUUID();

  try {
    await database.$transaction(async (transaction) => {
      const existing = await transaction.meshtasticChannel.aggregate({
        where: { eventId },
        _count: { _all: true },
        _max: { sortOrder: true },
      });
      if (existing._count._all >= MESHTASTIC_MAX_CHANNELS) {
        throw channelLimitProblem();
      }

      const row = await transaction.meshtasticChannel.create({
        data: {
          id,
          eventId,
          name: input.name,
          sortOrder: input.sortOrder ?? (existing._max.sortOrder ?? -1) + 1,
          pskEnvelope: encryptChannelPsk(id, psk),
          pskBytes: psk.length,
          uplinkEnabled: input.uplinkEnabled ?? false,
          downlinkEnabled: input.downlinkEnabled ?? false,
          positionPrecision: input.positionPrecision ?? 0,
          secret: selection.secret,
        },
      });
      await replaceSelectors(transaction, id, selection);
      await recordAudit(
        audit(actor, "meshtastic-channel.created", row, {
          pskKind: pskKind(psk.length),
          secret: selection.secret,
        }),
        transaction,
      );
    });
  } catch (error: unknown) {
    throw nameConflict(error);
  }

  return channelDto(eventId, id);
}

export async function updateMeshtasticChannel(
  actor: ActorContext,
  eventId: string,
  channelId: string,
  input: UpdateMeshtasticChannelRequest,
): Promise<MeshtasticChannelDto> {
  await requireMutableEvent(actor.principal, eventId);
  const current = await findChannel(eventId, channelId);
  if (current.version !== input.version) {
    throw versionConflictProblem(current.version);
  }
  await validateChannelInput(eventId, input, current.pskBytes);

  try {
    await database.$transaction(async (transaction) => {
      const updated = await transaction.meshtasticChannel.updateMany({
        where: { id: channelId, eventId, version: input.version },
        data: {
          name: input.name,
          sortOrder: input.sortOrder,
          uplinkEnabled: input.uplinkEnabled,
          downlinkEnabled: input.downlinkEnabled,
          positionPrecision: input.positionPrecision,
          secret: input.secret,
          // A channel that stays secret keeps its release; becoming secret withholds it anew.
          releasedAt: input.secret && current.secret ? current.releasedAt : null,
          version: { increment: 1 },
        },
      });
      if (updated.count !== 1) {
        const latest = await transaction.meshtasticChannel.findUnique({ where: { id: channelId } });
        throw latest === null ? notFoundProblem() : versionConflictProblem(latest.version);
      }
      await replaceSelectors(transaction, channelId, input);
      await recordAudit(
        audit(actor, "meshtastic-channel.updated", { ...current, name: input.name }, {
          secret: input.secret,
        }),
        transaction,
      );
    });
  } catch (error: unknown) {
    throw nameConflict(error);
  }

  return channelDto(eventId, channelId);
}

export async function deleteMeshtasticChannel(
  actor: ActorContext,
  eventId: string,
  channelId: string,
): Promise<void> {
  await requireMutableEvent(actor.principal, eventId);
  const current = await findChannel(eventId, channelId);

  await database.$transaction(async (transaction) => {
    await transaction.meshtasticChannel.delete({ where: { id: current.id } });
    await recordAudit(audit(actor, "meshtastic-channel.deleted", current), transaction);
  });
}

/** Replaces a leaked or outdated key. Later profiles and handouts use only the new key. */
export async function rotateMeshtasticChannelPsk(
  actor: ActorContext,
  eventId: string,
  channelId: string,
  input: RotateChannelPskRequest,
): Promise<MeshtasticChannelDto> {
  await requireMutableEvent(actor.principal, eventId);
  const current = await findChannel(eventId, channelId);
  if (current.version !== input.version) {
    throw versionConflictProblem(current.version);
  }
  const psk = parseOrGeneratePsk(input.psk);
  const problems = secrecyProblems(current.secret, EMPTY_AUDIENCE, psk.length);
  if (problems.length > 0) {
    throw validationProblem(problems);
  }

  await database.$transaction(async (transaction) => {
    const updated = await transaction.meshtasticChannel.updateMany({
      where: { id: channelId, eventId, version: input.version },
      data: {
        pskEnvelope: encryptChannelPsk(channelId, psk),
        pskBytes: psk.length,
        pskVersion: { increment: 1 },
        pskRotatedAt: new Date(),
        version: { increment: 1 },
      },
    });
    if (updated.count !== 1) {
      const latest = await transaction.meshtasticChannel.findUnique({ where: { id: channelId } });
      throw latest === null ? notFoundProblem() : versionConflictProblem(latest.version);
    }
    await recordAudit(
      audit(actor, "meshtastic-channel.psk-rotated", current, {
        pskKind: pskKind(psk.length),
        pskVersion: current.pskVersion + 1,
      }),
      transaction,
    );
  });

  return channelDto(eventId, channelId);
}

function notWithheldProblem(): ProblemError {
  return new ProblemError({
    type: "urn:openmeshtak:problem:channel-not-withheld",
    title: "Channel is not withheld",
    status: 409,
    detail: "Only secret channels that have not been released yet can be released.",
    code: "CHANNEL_NOT_WITHHELD",
  });
}

/**
 * Hands a secret channel to its whole audience from now on. Earlier artifacts are not reissued,
 * so members without a key holder's handout must fetch their profile again.
 */
export async function releaseMeshtasticChannel(
  actor: ActorContext,
  eventId: string,
  channelId: string,
  input: ReleaseMeshtasticChannelRequest,
): Promise<MeshtasticChannelDto> {
  await requireMutableEvent(actor.principal, eventId);
  const current = await findChannel(eventId, channelId);
  if (current.version !== input.version) {
    throw versionConflictProblem(current.version);
  }
  if (!current.secret || current.releasedAt !== null) {
    throw notWithheldProblem();
  }

  await database.$transaction(async (transaction) => {
    const updated = await transaction.meshtasticChannel.updateMany({
      where: { id: channelId, eventId, version: input.version, secret: true, releasedAt: null },
      data: { releasedAt: new Date(), version: { increment: 1 } },
    });
    if (updated.count !== 1) {
      const latest = await transaction.meshtasticChannel.findUnique({ where: { id: channelId } });
      throw latest === null ? notFoundProblem() : versionConflictProblem(latest.version);
    }
    await recordAudit(audit(actor, "meshtastic-channel.released", current), transaction);
  });

  return channelDto(eventId, channelId);
}

/**
 * The only way to read a stored key back. It needs `channel-keys.reveal` on top of event access,
 * and every reveal is audited, including on archived events.
 */
export async function revealMeshtasticChannelPsk(
  actor: ActorContext,
  eventId: string,
  channelId: string,
): Promise<RevealedChannelPsk> {
  await requireReadableEvent(actor.principal, eventId);
  await requireEventPermission(actor.principal, eventId, "channel-keys.reveal");
  const channel = await findChannel(eventId, channelId);
  const psk = decryptChannelPsk(channel);

  await recordAudit(
    audit(actor, "meshtastic-channel.psk-revealed", channel, { pskVersion: channel.pskVersion }),
  );
  return {
    kind: pskKind(psk.length),
    version: channel.pskVersion,
    psk: psk.toString("base64"),
  };
}
