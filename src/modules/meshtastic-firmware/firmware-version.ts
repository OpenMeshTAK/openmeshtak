/**
 * Meshtastic firmware versions as OpenMeshTak uses them: a line such as `2.8` or a line plus a
 * minimum patch such as `2.7.10`. Build suffixes are never part of a recommendation.
 */
export interface FirmwareVersion {
  major: number;
  minor: number;
  patch: number | null;
}

const VERSION_PATTERN = /^(0|[1-9]\d{0,3})\.(0|[1-9]\d{0,3})(?:\.(0|[1-9]\d{0,4}))?$/;

export function parseFirmwareVersion(value: string): FirmwareVersion | null {
  const match = VERSION_PATTERN.exec(value);
  if (match === null) {
    return null;
  }
  return {
    major: Number(match[1]),
    minor: Number(match[2]),
    patch: match[3] === undefined ? null : Number(match[3]),
  };
}

export function lineOf(version: FirmwareVersion): string {
  return `${String(version.major)}.${String(version.minor)}`;
}

export function formatFirmwareVersion(version: FirmwareVersion): string {
  return version.patch === null ? lineOf(version) : `${lineOf(version)}.${String(version.patch)}`;
}

/** Compares two complete `major.minor.patch` versions; a missing patch counts as 0. */
export function compareFirmwareVersions(left: FirmwareVersion, right: FirmwareVersion): number {
  return (
    left.major - right.major ||
    left.minor - right.minor ||
    (left.patch ?? 0) - (right.patch ?? 0)
  );
}
