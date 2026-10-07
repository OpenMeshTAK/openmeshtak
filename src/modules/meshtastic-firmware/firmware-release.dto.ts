export interface FirmwareReleaseDto {
  /** `major.minor.patch`, e.g. `2.8.1`. */
  version: string;
  /** Short commit hash of the build, e.g. `8e6a88d`. */
  build: string;
  channel: "stable" | "beta" | "alpha";
  /**
   * `tested`: in a shipped profile's line and verified on a device; `supported`: in a shipped
   * profile's line at or above its minimum; `unsupported`: no shipped profile covers it.
   */
  support: "tested" | "supported" | "unsupported";
  /** The profile that covers the release, or null when it is unsupported. */
  profileId: string | null;
  /** Upstream release page on GitHub. */
  releaseUrl: string;
}

export interface FirmwareReleaseListDto {
  /**
   * `current`: the latest lookup succeeded; `cached`: the latest lookup failed and the list is the
   * last successful one; `unknown`: no lookup has succeeded yet; `disabled`: lookups are switched off.
   */
  status: "current" | "cached" | "unknown" | "disabled";
  /** When the shown list was downloaded; null without a list. */
  fetchedAt: string | null;
  /** Full releases only, newest first; revoked and pull-request builds are left out. */
  releases: FirmwareReleaseDto[];
}

export interface FirmwareReleaseSettingsDto {
  /** Look up published releases from the official Meshtastic flasher. */
  checkEnabled: boolean;
  /** Optimistic-concurrency version; 0 while the default is in use. */
  version: number;
}

export interface UpdateFirmwareReleaseSettingsRequest {
  /**
   * @isInt
   * @minimum 0
   */
  version: number;
  checkEnabled: boolean;
}
