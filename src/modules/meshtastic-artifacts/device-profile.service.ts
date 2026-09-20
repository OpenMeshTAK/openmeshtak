import { createHash } from "node:crypto";
import type { MeshtasticChannel } from "../../generated/prisma/client.js";
import { recordAudit, type AuditEntry } from "../../shared/audit/audit.js";
import type { ActorContext } from "../../shared/auth/principal.js";
import { database } from "../../shared/database/database.js";
import { notFoundProblem, ProblemError } from "../../shared/errors/problem-error.js";
import { latestConfigurationRevision } from "../event-configuration/configuration-revisions.service.js";
import { parseConfigurationSnapshot } from "../event-configuration/configuration-snapshot.js";
import { decryptChannelPsk } from "../meshtastic-channels/channel-psk.js";
import { meshtasticChannelSetUrl } from "../meshtastic-channels/channel-url.js";
import { findFirmwareProfile } from "../meshtastic-firmware/firmware-profiles.js";
import {
  enumValues,
  type LoadedFirmwareField,
  type LoadedFirmwareProfile,
} from "../meshtastic-firmware/firmware-profile-loader.js";
import type { ManagedFieldKey } from "../meshtastic-firmware/managed-fields.js";
import type { ProfileChannel, ResolvedProfileDto } from "../profiles/profile.dto.js";
import { deviceChannels } from "../profiles/profile-tak.js";
import { getMemberProfile } from "../profiles/profiles.service.js";
import { encodeDeviceProfile, type DeviceProfileValue } from "./device-profile-encoder.js";

export interface DeviceProfileArtifact {
  fileName: string;
  bytes: Uint8Array;
}

function republishProblem(detail: string): ProblemError {
  return new ProblemError({
    type: "urn:openmeshtak:problem:meshtastic-not-published",
    title: "Meshtastic configuration not published",
    status: 409,
    detail,
    code: "MESHTASTIC_NOT_PUBLISHED",
  });
}

/** Only the member themself downloads their device profile, and only while the event is active. */
async function requireOwnActiveMembership(actor: ActorContext, eventId: string, memberId: string): Promise<void> {
  if (actor.principal.type !== "user") {
    throw notFoundProblem();
  }
  const member = await database.eventMember.findFirst({
    where: { id: memberId, eventId },
    select: { userId: true, event: { select: { status: true } } },
  });
  if (member === null || member.userId !== actor.principal.id || member.event.status !== "active") {
    throw notFoundProblem();
  }
}

/**
 * The firmware profile the latest revision was published with. A Core upgrade that changed the
 * profile file needs a new publication, so artifacts always match their recorded provenance.
 */
async function publishedFirmware(eventId: string) {
  const revision = await latestConfigurationRevision(database, eventId);
  const meshtastic = revision === null ? null : parseConfigurationSnapshot(revision.snapshot).meshtastic;
  if (revision === null || meshtastic === null) {
    throw republishProblem("Publish the event configuration to include its Meshtastic settings.");
  }
  const profile = await findFirmwareProfile(meshtastic.profileId);
  if (profile?.sha256 !== meshtastic.profileSha256) {
    throw republishProblem("The firmware profile changed with this OpenMeshTak release. Publish the configuration again.");
  }
  return { revision, meshtastic, profile };
}

/**
 * OpenMeshTak stores TAK teams and roles with ATAK display names (`Dark Blue`, `Team Member`);
 * the Meshtastic TAK module uses the upstream `atak.proto` enum names (`Dark_Blue`, `TeamMember`).
 */
function managedValue(key: ManagedFieldKey, profile: ResolvedProfileDto): DeviceProfileValue | null {
  switch (key) {
    case "longName":
      return profile.meshtastic.longName;
    case "shortName":
      return profile.meshtastic.shortName;
    case "moduleConfig.tak.team":
      return profile.tak.team.replaceAll(" ", "_");
    case "moduleConfig.tak.role":
      return profile.tak.role.replaceAll(" ", "");
  }
}

function unsupportedValueProblem(field: LoadedFirmwareField, reason: string): ProblemError {
  return new ProblemError({
    type: "urn:openmeshtak:problem:device-profile-value-unsupported",
    title: "Value does not fit the device profile",
    status: 409,
    detail: `${field.definition.label} ${reason} Ask an administrator to adjust it.`,
    code: "DEVICE_PROFILE_VALUE_UNSUPPORTED",
  });
}

/**
 * Managed values come from member and group data rather than the validated settings document, so
 * they are checked against the profile here. A callsign longer than the DeviceProfile limit would
 * otherwise produce a file the Meshtastic app rejects or truncates.
 */
function checkManagedValue(firmware: LoadedFirmwareProfile, field: LoadedFirmwareField, value: DeviceProfileValue): void {
  const { definition } = field;
  if (definition.type === "string" && typeof value === "string" && Buffer.byteLength(value, "utf8") > definition.maxBytes) {
    throw unsupportedValueProblem(field, `is longer than the ${String(definition.maxBytes)} bytes a device profile allows.`);
  }
  if (definition.type === "enum" && !(enumValues(firmware, definition.enum) ?? []).includes(String(value))) {
    throw unsupportedValueProblem(field, `${String(value)} is not supported by this firmware.`);
  }
}

/**
 * Only channels the member receives now go into the file. Without the primary channel, importing
 * a channel set would turn a secondary channel into the primary one, so the channel URL is left
 * out entirely and the device keeps its current channels until the key holder shares them.
 */
function deliverableChannels(profile: ResolvedProfileDto): ProfileChannel[] {
  return deviceChannels(profile.meshtastic.channels);
}

function fileNameFor(callsign: string, line: string): string {
  const safe = callsign.replace(/[^A-Za-z0-9_-]+/g, "-").replace(/^-+|-+$/g, "") || "member";
  return `${safe}-fw${line}.cfg`;
}

function profileValues(
  firmware: LoadedFirmwareProfile,
  settings: Record<string, DeviceProfileValue>,
  profile: ResolvedProfileDto,
): Map<string, DeviceProfileValue> {
  const values = new Map<string, DeviceProfileValue>();
  for (const field of firmware.fields) {
    const { key, definition } = field;
    const value =
      definition.managedBy === undefined ? settings[key] : managedValue(key as ManagedFieldKey, profile);
    if (value === undefined || value === null) {
      continue;
    }
    if (definition.managedBy !== undefined) {
      checkManagedValue(firmware, field, value);
    }
    values.set(key, value);
  }
  return values;
}

/** Audits the file and, separately, every secret channel it hands to a key holder before release. */
function auditEntries(
  actor: ActorContext,
  eventId: string,
  memberId: string,
  context: { revisionNumber: number; profileId: string; artifactSha256: string },
  channels: Array<{ published: ProfileChannel; stored: MeshtasticChannel }>,
): AuditEntry[] {
  const handouts = channels
    .filter(({ stored }) => stored.secret && stored.releasedAt === null)
    .map(({ published, stored }): AuditEntry => ({
      actor: actor.principal,
      action: "meshtastic-channel.handout-delivered",
      targetType: "meshtastic-channel",
      targetId: stored.id,
      result: "success",
      traceId: actor.traceId,
      metadata: { eventId, memberId, channelName: published.name, pskVersion: stored.pskVersion, format: "device-profile" },
    }));
  return [
    {
      actor: actor.principal,
      action: "meshtastic.device-profile-generated",
      targetType: "event-member",
      targetId: memberId,
      result: "success",
      traceId: actor.traceId,
      metadata: {
        eventId,
        ...context,
        channels: channels.map(({ stored }) => ({ id: stored.id, pskVersion: stored.pskVersion })),
      },
    },
    ...handouts,
  ];
}

export async function generateDeviceProfile(
  actor: ActorContext,
  eventId: string,
  memberId: string,
): Promise<DeviceProfileArtifact> {
  await requireOwnActiveMembership(actor, eventId, memberId);
  const profile = await getMemberProfile(actor.principal, eventId, memberId);
  const { revision, meshtastic, profile: firmware } = await publishedFirmware(eventId);

  const published = deliverableChannels(profile);
  const stored = await database.meshtasticChannel.findMany({
    where: { eventId, id: { in: published.map(({ id }) => id) } },
  });
  const channels = published.flatMap((channel) => {
    const row = stored.find(({ id }) => id === channel.id);
    return row === undefined ? [] : [{ published: channel, stored: row }];
  });

  const values = profileValues(firmware, meshtastic.settings, profile);
  if (channels.length > 0) {
    values.set(
      "channelUrl",
      meshtasticChannelSetUrl(
        channels.map(({ published: channel, stored: row }) => ({
          id: row.id,
          name: channel.name,
          psk: decryptChannelPsk(row),
          pskVersion: row.pskVersion,
          primary: channel.primary,
          uplinkEnabled: channel.uplinkEnabled,
          downlinkEnabled: channel.downlinkEnabled,
          positionPrecision: channel.positionPrecision,
        })),
      ),
    );
  }

  const bytes = encodeDeviceProfile(firmware.deviceProfile, values);
  const context = {
    revisionNumber: revision.number,
    profileId: firmware.file.id,
    artifactSha256: createHash("sha256").update(bytes).digest("hex"),
  };
  await database.$transaction(async (transaction) => {
    for (const entry of auditEntries(actor, eventId, memberId, context, channels)) {
      await recordAudit(entry, transaction);
    }
  });

  return { fileName: fileNameFor(profile.callsign, firmware.file.firmware.line), bytes };
}
