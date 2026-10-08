import type { SnapshotTak } from "../event-configuration/configuration-snapshot.js";
import type { ProfileChannel, ProfileMeshtasticTakServer } from "./profile.dto.js";

/** Where the built-in TAK server is reached; the host name is `null` while it is disabled. */
export interface TakServerAddress {
  hostName: string | null;
  streamingPort: number;
}

/**
 * Channels in the order the member's device holds them after importing their device profile:
 * the included channels, but only when the primary channel is among them (the generator leaves
 * the channel list out otherwise, see device-profile.service).
 */
export function deviceChannels(channels: readonly ProfileChannel[]): ProfileChannel[] {
  const included = channels.filter(({ delivery }) => delivery === "included");
  return included[0]?.primary === true ? included : [];
}

/**
 * The member's Meshtastic app TAK server. The app's "TAK Mesh Channel" setting takes a slot on the
 * device, so the event's chosen channel is translated into this member's slot; the primary channel
 * is slot 0 and also the fallback when no channel is chosen.
 */
export function resolveMeshtasticTakServer(
  tak: SnapshotTak | null,
  channels: readonly ProfileChannel[],
): ProfileMeshtasticTakServer {
  const meshChannelId = tak?.meshChannelId ?? null;
  const onDevice = deviceChannels(channels);
  const slot =
    meshChannelId === null ? (onDevice.length > 0 ? 0 : -1) : onDevice.findIndex(({ id }) => id === meshChannelId);
  const channel = onDevice[slot];
  return { meshChannel: channel === undefined ? null : { name: channel.name, slot } };
}
