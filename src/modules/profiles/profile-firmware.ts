import type { SnapshotMeshtastic } from "../event-configuration/configuration-snapshot.js";
import { findFirmwareProfile } from "../meshtastic-firmware/firmware-profiles.js";
import { parseFirmwareVersion, lineOf } from "../meshtastic-firmware/firmware-version.js";
import { isVerified } from "../meshtastic-configuration/event-firmware.js";
import type { ProfileFirmware } from "./profile.dto.js";

/**
 * The firmware a participant must flash, taken from the published configuration. Returns null for
 * revisions created before events had a firmware version, or when this Core release no longer
 * ships the profile the revision was published with.
 */
export async function resolveProfileFirmware(
  meshtastic: SnapshotMeshtastic | null,
): Promise<ProfileFirmware | null> {
  if (meshtastic === null) {
    return null;
  }
  const profile = await findFirmwareProfile(meshtastic.profileId);
  const effectiveMinimum = parseFirmwareVersion(meshtastic.effectiveMinimumVersion);
  if (profile === undefined || effectiveMinimum === null) {
    return null;
  }

  return {
    recommendedVersion: meshtastic.firmwareVersion,
    line: lineOf(effectiveMinimum),
    minimumVersion: meshtastic.effectiveMinimumVersion,
    channel: profile.file.firmware.channel,
    verified: isVerified({ recommended: meshtastic.firmwareVersion, effectiveMinimum, profile }),
    flasherUrl: profile.file.flasherUrl,
    flashingNotes: profile.file.flashingNotes ?? null,
  };
}
