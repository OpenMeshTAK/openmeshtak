import type { ProblemFieldError } from "../../shared/errors/problem-error.js";
import type { LoadedFirmwareProfile } from "../meshtastic-firmware/firmware-profile-loader.js";
import {
  compareFirmwareVersions,
  formatFirmwareVersion,
  lineOf,
  parseFirmwareVersion,
  type FirmwareVersion,
} from "../meshtastic-firmware/firmware-version.js";

/** An event's recommended firmware resolved against the shipped profiles. */
export interface EventFirmware {
  /** As entered, e.g. `2.8` or `2.8.3`. */
  recommended: string;
  /** The given patch, or the profile minimum when only a line was given. */
  effectiveMinimum: FirmwareVersion;
  profile: LoadedFirmwareProfile;
}

export type EventFirmwareResult =
  | { ok: true; firmware: EventFirmware }
  | { ok: false; problem: ProblemFieldError };

function problem(code: string, message: string): EventFirmwareResult {
  return { ok: false, problem: { field: "firmwareVersion", code, message } };
}

export function resolveEventFirmware(
  profiles: readonly LoadedFirmwareProfile[],
  recommended: string,
): EventFirmwareResult {
  const version = parseFirmwareVersion(recommended);
  if (version === null) {
    return problem("INVALID_FIRMWARE_VERSION", "Use a firmware line such as 2.8 or a version such as 2.8.1.");
  }

  const profile = profiles.find(({ file }) => file.firmware.line === lineOf(version));
  if (profile === undefined) {
    const lines = profiles.map(({ file }) => file.firmware.line).join(", ");
    return problem("UNSUPPORTED_FIRMWARE_LINE", `Supported firmware lines: ${lines}.`);
  }
  if (version.patch !== null && compareFirmwareVersions(version, profile.min) < 0) {
    return problem(
      "FIRMWARE_BELOW_MINIMUM",
      `The ${profile.file.firmware.line} line is supported from ${formatFirmwareVersion(profile.min)}.`,
    );
  }

  return {
    ok: true,
    firmware: {
      recommended: formatFirmwareVersion(version),
      effectiveMinimum: version.patch === null ? profile.min : version,
      profile,
    },
  };
}

/** A recommendation newer than every tested patch is allowed but shown as not verified. */
export function isVerified(firmware: EventFirmware): boolean {
  return firmware.profile.file.firmware.tested.some((tested) => {
    const version = parseFirmwareVersion(tested);
    return version !== null && compareFirmwareVersions(version, firmware.effectiveMinimum) >= 0;
  });
}
