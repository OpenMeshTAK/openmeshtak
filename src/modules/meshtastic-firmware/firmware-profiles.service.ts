import { eventAccessFor, forbidden } from "../../shared/auth/permission-check.js";
import type { Principal } from "../../shared/auth/principal.js";
import { notFoundProblem } from "../../shared/errors/problem-error.js";
import type { LoadedFirmwareField, LoadedFirmwareProfile } from "./firmware-profile-loader.js";
import type {
  FirmwareFieldDto,
  FirmwareProfileDto,
  FirmwareProfileSummaryDto,
} from "./firmware-profile.dto.js";
import { findFirmwareProfile, firmwareProfiles } from "./firmware-profiles.js";
import { formatFirmwareVersion } from "./firmware-version.js";

/** Profiles hold no secrets, but they are configuration detail for people who edit events. */
async function requireEventEditor(principal: Principal): Promise<void> {
  const access = await eventAccessFor(principal, "events.manage");
  if (!access.all && access.eventIds.length === 0) {
    throw forbidden();
  }
}

export function toProfileSummary({ file, min }: LoadedFirmwareProfile): FirmwareProfileSummaryDto {
  return {
    id: file.id,
    line: file.firmware.line,
    minVersion: formatFirmwareVersion(min),
    testedVersions: file.firmware.tested,
    channel: file.firmware.channel,
    default: file.default,
    flasherUrl: file.flasherUrl,
  };
}

/** Copies only the attributes a field type defines, so absent values stay absent in JSON. */
function toFieldDto({ key, definition, since }: LoadedFirmwareField): FirmwareFieldDto {
  const optional = {
    description: definition.description,
    unit: definition.unit,
    maxBytes: "maxBytes" in definition ? definition.maxBytes : undefined,
    min: "min" in definition ? definition.min : undefined,
    max: "max" in definition ? definition.max : undefined,
    enum: "enum" in definition ? definition.enum : undefined,
    default: "default" in definition ? definition.default : undefined,
  };
  return {
    key,
    section: definition.section,
    type: definition.type,
    label: definition.label,
    since: formatFirmwareVersion(since),
    managed: definition.managedBy !== undefined,
    ...Object.fromEntries(Object.entries(optional).filter(([, value]) => value !== undefined)),
  };
}

export async function listFirmwareProfiles(principal: Principal): Promise<FirmwareProfileSummaryDto[]> {
  await requireEventEditor(principal);
  return (await firmwareProfiles()).map(toProfileSummary);
}

export async function getFirmwareProfile(principal: Principal, profileId: string): Promise<FirmwareProfileDto> {
  await requireEventEditor(principal);
  const profile = await findFirmwareProfile(profileId);
  if (profile === undefined) {
    throw notFoundProblem();
  }
  return {
    ...toProfileSummary(profile),
    flashingNotes: profile.file.flashingNotes ?? null,
    sha256: profile.sha256,
    sections: profile.file.sections,
    fields: profile.fields.map(toFieldDto),
    enums: profile.enums,
  };
}
