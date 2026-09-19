import { createHash } from "node:crypto";
import type { Prisma } from "../../generated/prisma/client.js";
import { toGroupProvisioning, type GroupProvisioning } from "../event-groups/group-provisioning.js";
import { toAudience } from "../meshtastic-channels/channel-audience.js";
import { CHANNEL_DEVICE_ORDER } from "../meshtastic-channels/channel-order.js";
import type { ChannelAudience } from "../meshtastic-channels/meshtastic-channel.dto.js";
import { loadMeshtasticConfiguration } from "../meshtastic-configuration/current-configuration.js";
import type { FirmwareSettingsDocument } from "../meshtastic-configuration/meshtastic-configuration.dto.js";
import { formatFirmwareVersion } from "../meshtastic-firmware/firmware-version.js";

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
 * The event's Meshtastic firmware target and settings, with the profile file hash so an artifact
 * can always be traced back to the exact field definitions used to generate it.
 */
export interface SnapshotMeshtastic {
  firmwareVersion: string;
  effectiveMinimumVersion: string;
  profileId: string;
  profileSha256: string;
  settings: FirmwareSettingsDocument;
}

/**
 * Bump `schemaVersion` whenever the snapshot shape changes; old revisions are never rewritten.
 * Version 2 added `channels` in device order, the first being the primary channel; version 3
 * added `meshtastic`.
 */
export interface ConfigurationSnapshot {
  schemaVersion: 1 | 2 | 3;
  roles: SnapshotRole[];
  groups: SnapshotGroup[];
  channels: SnapshotChannel[];
  /** `null` in revisions created before version 3. */
  meshtastic: SnapshotMeshtastic | null;
}

/**
 * Reads the event's current configuration in a deterministic order (by slug, channels by device
 * order), so the same configuration always serializes to the same JSON and therefore hash.
 */
export async function buildConfigurationSnapshot(
  transaction: Prisma.TransactionClient,
  eventId: string,
): Promise<ConfigurationSnapshot> {
  const [roles, groups, channels, meshtastic] = await Promise.all([
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
    loadMeshtasticConfiguration(transaction, eventId),
  ]);
  const { firmware } = meshtastic;

  return {
    schemaVersion: 3,
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
    // Readiness checks keep unresolvable firmware out of published revisions.
    meshtastic:
      firmware === null
        ? null
        : {
            firmwareVersion: meshtastic.firmwareVersion,
            effectiveMinimumVersion: formatFirmwareVersion(firmware.effectiveMinimum),
            profileId: firmware.profile.file.id,
            profileSha256: firmware.profile.sha256,
            settings: meshtastic.settings,
          },
  };
}

export function hashConfigurationSnapshot(snapshot: ConfigurationSnapshot): string {
  return createHash("sha256").update(JSON.stringify(snapshot), "utf8").digest("hex");
}

/**
 * Revisions are written only by this module from `ConfigurationSnapshot` values. Version 1
 * revisions predate event channels and therefore publish none; versions before 3 carry no
 * Meshtastic configuration.
 */
export function parseConfigurationSnapshot(value: Prisma.JsonValue): ConfigurationSnapshot {
  const snapshot = value as unknown as Omit<ConfigurationSnapshot, "channels" | "meshtastic"> & {
    channels?: SnapshotChannel[];
    meshtastic?: SnapshotMeshtastic | null;
  };
  return { ...snapshot, channels: snapshot.channels ?? [], meshtastic: snapshot.meshtastic ?? null };
}
