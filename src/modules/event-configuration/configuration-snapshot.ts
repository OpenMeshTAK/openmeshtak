import { createHash } from "node:crypto";
import type { Prisma } from "../../generated/prisma/client.js";
import { toGroupProvisioning, type GroupProvisioning } from "../event-groups/group-provisioning.js";
import { toAudience } from "../meshtastic-channels/channel-audience.js";
import { CHANNEL_DEVICE_ORDER } from "../meshtastic-channels/channel-order.js";
import type { ChannelAudience } from "../meshtastic-channels/meshtastic-channel.dto.js";

export interface SnapshotRole {
  id: string;
  slug: string;
  name: string;
}

export interface SnapshotGroup {
  id: string;
  slug: string;
  name: string;
  provisioning: GroupProvisioning;
}

/**
 * A channel's published settings. Keys never enter snapshots: they stay encrypted on the channel,
 * and rotation and release act on the channel directly so a leaked key stops being handed out at
 * once. `pskVersion` records which key was current when the revision was created.
 */
export interface SnapshotChannel {
  id: string;
  name: string;
  uplinkEnabled: boolean;
  downlinkEnabled: boolean;
  positionPrecision: number;
  secret: boolean;
  pskVersion: number;
  audience: ChannelAudience;
  keyHolders: ChannelAudience;
}

/**
 * Bump `schemaVersion` whenever the snapshot shape changes; old revisions are never rewritten.
 * Version 2 added `channels` in device order, the first being the primary channel.
 */
export interface ConfigurationSnapshot {
  schemaVersion: 1 | 2;
  roles: SnapshotRole[];
  groups: SnapshotGroup[];
  channels: SnapshotChannel[];
}

/**
 * Reads the event's current configuration in a deterministic order (by slug, channels by device
 * order), so the same configuration always serializes to the same JSON and therefore hash.
 */
export async function buildConfigurationSnapshot(
  transaction: Prisma.TransactionClient,
  eventId: string,
): Promise<ConfigurationSnapshot> {
  const [roles, groups, channels] = await Promise.all([
    transaction.eventRole.findMany({
      where: { eventId },
      orderBy: { slug: "asc" },
      select: { id: true, slug: true, name: true },
    }),
    transaction.eventGroup.findMany({ where: { eventId }, orderBy: { slug: "asc" } }),
    transaction.meshtasticChannel.findMany({
      where: { eventId },
      orderBy: [...CHANNEL_DEVICE_ORDER],
      include: { audience: true },
    }),
  ]);

  return {
    schemaVersion: 2,
    roles,
    groups: groups.map((group) => ({
      id: group.id,
      slug: group.slug,
      name: group.name,
      provisioning: toGroupProvisioning(group),
    })),
    channels: channels.map((channel) => ({
      id: channel.id,
      name: channel.name,
      uplinkEnabled: channel.uplinkEnabled,
      downlinkEnabled: channel.downlinkEnabled,
      positionPrecision: channel.positionPrecision,
      secret: channel.secret,
      pskVersion: channel.pskVersion,
      audience: toAudience(channel.audience),
      keyHolders: toAudience(channel.audience, true),
    })),
  };
}

export function hashConfigurationSnapshot(snapshot: ConfigurationSnapshot): string {
  return createHash("sha256").update(JSON.stringify(snapshot), "utf8").digest("hex");
}

/**
 * Revisions are written only by this module from `ConfigurationSnapshot` values. Version 1
 * revisions predate event channels and therefore publish none.
 */
export function parseConfigurationSnapshot(value: Prisma.JsonValue): ConfigurationSnapshot {
  const snapshot = value as unknown as Omit<ConfigurationSnapshot, "channels"> & {
    channels?: SnapshotChannel[];
  };
  return { ...snapshot, channels: snapshot.channels ?? [] };
}
