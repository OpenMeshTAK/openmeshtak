import type { ActorContext } from "../../shared/auth/principal.js";
import { recordAudit } from "../../shared/audit/audit.js";
import { database } from "../../shared/database/database.js";
import { notFoundProblem } from "../../shared/errors/problem-error.js";
import { decryptChannelPsk } from "../meshtastic-channels/channel-psk.js";
import { meshtasticChannelUrl } from "../meshtastic-channels/channel-url.js";
import type { ChannelHandoutDto } from "./channel-handout.dto.js";
import { getMemberProfile } from "./profiles.service.js";

/**
 * Delivers one published secret channel only to its signed-in key holder. The URL contains the
 * PSK in its fragment, so it is created on demand and never enters a normal profile response.
 */
export async function getChannelHandout(
  actor: ActorContext,
  eventId: string,
  memberId: string,
  channelId: string,
): Promise<ChannelHandoutDto> {
  if (actor.principal.type !== "user") {
    throw notFoundProblem();
  }

  const member = await database.eventMember.findFirst({
    where: { id: memberId, eventId },
    select: { userId: true, event: { select: { status: true } } },
  });
  if (
    member === null ||
    member.userId !== actor.principal.id ||
    member.event.status !== "active"
  ) {
    throw notFoundProblem();
  }

  const profile = await getMemberProfile(actor.principal, eventId, memberId);
  const published = profile.meshtastic.channels.find(
    (channel) => channel.id === channelId && channel.keyHolder,
  );
  if (published === undefined) {
    throw notFoundProblem();
  }

  const stored = await database.meshtasticChannel.findFirst({
    where: { id: channelId, eventId, secret: true },
  });
  if (stored === null) {
    throw notFoundProblem();
  }

  const handout: ChannelHandoutDto = {
    channelId,
    channelName: published.name,
    primary: published.primary,
    pskVersion: stored.pskVersion,
    url: meshtasticChannelUrl({
      id: stored.id,
      name: published.name,
      psk: decryptChannelPsk(stored),
      pskVersion: stored.pskVersion,
      primary: published.primary,
      uplinkEnabled: published.uplinkEnabled,
      downlinkEnabled: published.downlinkEnabled,
      positionPrecision: published.positionPrecision,
    }),
  };

  await recordAudit({
    actor: actor.principal,
    action: "meshtastic-channel.handout-delivered",
    targetType: "meshtastic-channel",
    targetId: stored.id,
    result: "success",
    traceId: actor.traceId,
    metadata: {
      eventId,
      memberId,
      channelName: published.name,
      pskVersion: stored.pskVersion,
      format: "channel-url",
    },
  });

  return handout;
}
