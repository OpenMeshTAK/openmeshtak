import { recordAudit } from "../../shared/audit/audit.js";
import { requirePermission } from "../../shared/auth/permission-check.js";
import type { ActorContext, Principal } from "../../shared/auth/principal.js";
import { database } from "../../shared/database/database.js";
import { isUniqueConstraintError } from "../../shared/database/unique-constraint.js";
import { versionConflictProblem } from "../../shared/errors/problem-error.js";
import type { LoadedFirmwareProfile } from "./firmware-profile-loader.js";
import { firmwareProfiles } from "./firmware-profiles.js";
import { requireEventEditor } from "./firmware-profiles.service.js";
import { FirmwareReleaseFeed, type PublishedFirmwareRelease } from "./firmware-release-feed.js";
import type {
  FirmwareReleaseDto,
  FirmwareReleaseListDto,
  FirmwareReleaseSettingsDto,
  UpdateFirmwareReleaseSettingsRequest,
} from "./firmware-release.dto.js";
import { compareFirmwareVersions, formatFirmwareVersion, lineOf } from "./firmware-version.js";

const SETTINGS_ID = "meshtastic";

let feed = new FirmwareReleaseFeed();

/** Replaces the release feed; tests use it to avoid network access. */
export function useFirmwareReleaseFeed(replacement: FirmwareReleaseFeed): void {
  feed = replacement;
}

async function loadSettings(): Promise<FirmwareReleaseSettingsDto> {
  const row = await database.firmwareReleaseSettings.findUnique({ where: { id: SETTINGS_ID } });
  return row === null ? { checkEnabled: true, version: 0 } : { checkEnabled: row.checkEnabled, version: row.version };
}

/**
 * Whether OpenMeshTak supports a release is decided only by the shipped, device-tested profiles;
 * the upstream list just says which builds exist.
 */
function toReleaseDto(release: PublishedFirmwareRelease, profiles: LoadedFirmwareProfile[]): FirmwareReleaseDto {
  const version = formatFirmwareVersion(release.version);
  const profile = profiles.find(({ file }) => file.firmware.line === lineOf(release.version));
  const covered = profile !== undefined && compareFirmwareVersions(release.version, profile.min) >= 0;
  return {
    version,
    build: release.build,
    channel: release.channel,
    support: !covered ? "unsupported" : profile.file.firmware.tested.includes(version) ? "tested" : "supported",
    profileId: covered ? profile.file.id : null,
    releaseUrl: `https://github.com/meshtastic/firmware/releases/tag/v${version}.${release.build}`,
  };
}

export async function listFirmwareReleases(principal: Principal): Promise<FirmwareReleaseListDto> {
  await requireEventEditor(principal);
  if (!(await loadSettings()).checkEnabled) {
    return { status: "disabled", fetchedAt: null, releases: [] };
  }
  const { snapshot, lastLookupFailed } = await feed.state();
  if (snapshot === null) {
    return { status: "unknown", fetchedAt: null, releases: [] };
  }
  const profiles = await firmwareProfiles();
  return {
    status: lastLookupFailed ? "cached" : "current",
    fetchedAt: snapshot.fetchedAt.toISOString(),
    releases: snapshot.releases.map((release) => toReleaseDto(release, profiles)),
  };
}

/** Requires instance-wide `settings.manage`. */
export async function getFirmwareReleaseSettings(principal: Principal): Promise<FirmwareReleaseSettingsDto> {
  await requirePermission(principal, "settings.manage");
  return loadSettings();
}

/** Requires instance-wide `settings.manage`. */
export async function updateFirmwareReleaseSettings(
  actor: ActorContext,
  input: UpdateFirmwareReleaseSettingsRequest,
): Promise<FirmwareReleaseSettingsDto> {
  await requirePermission(actor.principal, "settings.manage");
  const { version, checkEnabled } = input;
  await database.$transaction(async (transaction) => {
    if (version === 0) {
      try {
        await transaction.firmwareReleaseSettings.create({ data: { id: SETTINGS_ID, checkEnabled } });
      } catch (error: unknown) {
        throw isUniqueConstraintError(error) ? versionConflictProblem((await loadSettings()).version) : error;
      }
    } else {
      const updated = await transaction.firmwareReleaseSettings.updateMany({
        where: { id: SETTINGS_ID, version },
        data: { checkEnabled, version: { increment: 1 } },
      });
      if (updated.count !== 1) {
        throw versionConflictProblem((await loadSettings()).version);
      }
    }
    await recordAudit(
      {
        actor: actor.principal,
        action: "firmware-release-settings.updated",
        targetType: "firmware-release-settings",
        targetId: SETTINGS_ID,
        result: "success",
        traceId: actor.traceId,
        metadata: { checkEnabled },
      },
      transaction,
    );
  });
  return loadSettings();
}
