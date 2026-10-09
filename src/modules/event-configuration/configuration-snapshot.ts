import type { TakRole } from "../event-groups/provisioning-values.js";
import { createHash } from "node:crypto";
import type { Prisma } from "../../generated/prisma/client.js";
import { toGroupProvisioning, type GroupProvisioning } from "../event-groups/group-provisioning.js";
import { toAudience } from "../meshtastic-channels/channel-audience.js";
import { CHANNEL_DEVICE_ORDER } from "../meshtastic-channels/channel-order.js";
import type { EventAudience } from "../event-audience/event-audience.js";
import { loadMeshtasticConfiguration } from "../meshtastic-configuration/current-configuration.js";
import type { FirmwareSettingsDocument } from "../meshtastic-configuration/meshtastic-configuration.dto.js";
import { formatFirmwareVersion } from "../meshtastic-firmware/firmware-version.js";
import type { AtakPreference, AtakPreferenceTarget } from "../tak-configuration/atak-preferences.js";
import { loadTakConfiguration, type CurrentTakConfiguration } from "../tak-configuration/tak-configuration.service.js";

export interface SnapshotRole {
  id: string;
  slug: string;
  name: string;
  /** `null` when the role keeps the group's TAK role, and in revisions before version 5. */
  takRoleOverride: TakRole | null;
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
  audience: EventAudience;
  keyHolders: EventAudience;
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
 * The Meshtastic app's TAK mesh channel and the ATAK preferences; `null` in revisions created
 * before version 4, and without ATAK preferences before version 7. Version 7 stored preferences
 * without targets, which all reached the whole event. Revisions before version 6 also stored a
 * connection mode, which the switch `meshtasticEnabled` replaced.
 */
export type SnapshotTak = CurrentTakConfiguration;

/**
 * Bump `schemaVersion` whenever the snapshot shape changes; old revisions are never rewritten.
 * Version 2 added `channels` in device order, the first being the primary channel; version 3
 * added `meshtastic`; version 4 added `tak`; version 5 added role TAK overrides; version 6 added
 * `meshtasticEnabled`; version 7 added `tak.atakPreferences`; version 8 gave each preference a target.
 */
export interface ConfigurationSnapshot {
  schemaVersion: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;
  /**
   * Whether the event provisions Meshtastic radios; `true` in revisions before version 6. When
   * `false`, `channels` is empty and `meshtastic` is `null`.
   */
  meshtasticEnabled: boolean;
  roles: SnapshotRole[];
  groups: SnapshotGroup[];
  channels: SnapshotChannel[];
  /** `null` in revisions created before version 3. */
  meshtastic: SnapshotMeshtastic | null;
  tak: SnapshotTak | null;
}

/**
 * Reads the event's current configuration in a deterministic order (by slug, channels by device
 * order), so the same configuration always serializes to the same JSON and therefore hash.
 */
export async function buildConfigurationSnapshot(
  transaction: Prisma.TransactionClient,
  eventId: string,
): Promise<ConfigurationSnapshot> {
  const [event, roles, groups, channels, meshtastic, tak] = await Promise.all([
    transaction.event.findUniqueOrThrow({ where: { id: eventId }, select: { meshtasticEnabled: true } }),
    transaction.eventRole.findMany({
      where: { eventId },
      orderBy: { slug: "asc" },
      select: { id: true, slug: true, name: true, takRoleOverride: true },
    }),
    transaction.eventGroup.findMany({ where: { eventId }, orderBy: { slug: "asc" } }),
    transaction.meshtasticChannel.findMany({
      where: { eventId },
      orderBy: [...CHANNEL_DEVICE_ORDER],
      include: { audience: true },
    }),
    loadMeshtasticConfiguration(transaction, eventId),
    loadTakConfiguration(transaction, eventId),
  ]);
  const { firmware } = meshtastic;
  // A TAK-only event keeps its stored channels and radio settings for later, but publishes none.
  const { meshtasticEnabled } = event;

  return {
    schemaVersion: 8,
    meshtasticEnabled,
    roles: roles.map((role) => ({ ...role, takRoleOverride: role.takRoleOverride as TakRole | null })),
    groups: groups.map((group) => ({
      id: group.id,
      slug: group.slug,
      name: group.name,
      provisioning: toGroupProvisioning(group),
    })),
    channels: (meshtasticEnabled ? channels : []).map((channel) => ({
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
      !meshtasticEnabled || firmware === null
        ? null
        : {
            firmwareVersion: meshtastic.firmwareVersion,
            effectiveMinimumVersion: formatFirmwareVersion(firmware.effectiveMinimum),
            profileId: firmware.profile.file.id,
            profileSha256: firmware.profile.sha256,
            settings: meshtastic.settings,
          },
    tak: { meshChannelId: meshtasticEnabled ? tak.meshChannelId : null, atakPreferences: tak.atakPreferences },
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
  const snapshot = value as unknown as Omit<ConfigurationSnapshot, "meshtasticEnabled" | "channels" | "meshtastic" | "tak"> & {
    meshtasticEnabled?: boolean;
    channels?: SnapshotChannel[];
    meshtastic?: SnapshotMeshtastic | null;
    tak?: (Omit<SnapshotTak, "atakPreferences"> & { atakPreferences?: Array<AtakPreference & { target?: AtakPreferenceTarget }> }) | null;
  };
  return {
    ...snapshot,
    meshtasticEnabled: snapshot.meshtasticEnabled ?? true,
    roles: snapshot.roles.map((role) => ({ ...role, takRoleOverride: role.takRoleOverride ?? null })),
    channels: snapshot.channels ?? [],
    meshtastic: snapshot.meshtastic ?? null,
    tak:
      snapshot.tak === undefined || snapshot.tak === null
        ? null
        : {
            meshChannelId: snapshot.tak.meshChannelId,
            atakPreferences: (snapshot.tak.atakPreferences ?? []).map((entry) => ({ ...entry, target: entry.target ?? { type: "event" } })),
          },
  };
}
