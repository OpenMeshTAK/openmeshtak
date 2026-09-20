import type { SnapshotTak } from "../event-configuration/configuration-snapshot.js";
import type { ProfileChannel, ProfileTakConnection } from "./profile.dto.js";

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
 * The member's TAK connection. The app's "TAK Mesh Channel" setting takes a slot on the device,
 * so the event's chosen channel is translated into this member's slot; the primary channel is
 * slot 0 and also the fallback when no channel is chosen.
 */
export function resolveTakConnection(
  tak: SnapshotTak | null,
  channels: readonly ProfileChannel[],
): ProfileTakConnection | null {
  if (tak === null || tak.mode !== "meshtastic-local-server") {
    return null;
  }
  const onDevice = deviceChannels(channels);
  const slot =
    tak.meshChannelId === null ? (onDevice.length > 0 ? 0 : -1) : onDevice.findIndex(({ id }) => id === tak.meshChannelId);
  const channel = onDevice[slot];
  return { mode: "meshtastic-local-server", meshChannel: channel === undefined ? null : { name: channel.name, slot } };
}
