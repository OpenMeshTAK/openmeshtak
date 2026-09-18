import type { SnapshotChannel } from "../event-configuration/configuration-snapshot.js";
import type { ChannelAudience } from "../meshtastic-channels/meshtastic-channel.dto.js";
import type { ProfileChannel } from "./profile.dto.js";

export interface ChannelRecipient {
  memberId: string;
  eventRoleId: string;
  eventGroupId: string;
}

/** Release state is read live from the channel so a release takes effect without publishing. */
export interface LiveChannelState {
  released: boolean;
}

function selects(selection: ChannelAudience, recipient: ChannelRecipient): boolean {
  return (
    selection.groupIds.includes(recipient.eventGroupId) ||
    selection.roleIds.includes(recipient.eventRoleId) ||
    selection.memberIds.includes(recipient.memberId)
  );
}

/**
 * Resolves which published channels one member receives. The primary channel reaches everyone;
 * a secondary channel only its audience, and is otherwise left out entirely rather than hidden.
 * Any channel, including the primary, may be secret. A withheld secret channel is `included` only
 * for key holders; everyone else in its audience learns only that it is handed out on site.
 * Channels deleted since publication are skipped because their key no longer exists.
 */
export function resolveProfileChannels(
  channels: SnapshotChannel[],
  live: ReadonlyMap<string, LiveChannelState>,
  recipient: ChannelRecipient,
): ProfileChannel[] {
  return channels.flatMap((channel, index): ProfileChannel[] => {
    const state = live.get(channel.id);
    const primary = index === 0;
    if (state === undefined || (!primary && !selects(channel.audience, recipient))) {
      return [];
    }

    const keyHolder = channel.secret && selects(channel.keyHolders, recipient);
    const withheld = channel.secret && !state.released;
    return [
      {
        id: channel.id,
        name: channel.name,
        primary,
        uplinkEnabled: channel.uplinkEnabled,
        downlinkEnabled: channel.downlinkEnabled,
        positionPrecision: channel.positionPrecision,
        delivery: withheld && !keyHolder ? "on-site" : "included",
        keyHolder,
      },
    ];
  });
}
