import { delimiter } from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "../../shared/config/config.js";
import { loadFirmwareProfiles, type LoadedFirmwareProfile } from "./firmware-profile-loader.js";

/** `firmware-profiles/` at the repository (or image) root, from both `src/` and `dist/`. */
const SHIPPED_PROFILES = fileURLToPath(new URL("../../../firmware-profiles", import.meta.url));

function profileDirectories(): string[] {
  const extra = config.meshtasticFirmwareProfileDirs?.split(delimiter).filter(Boolean) ?? [];
  return [SHIPPED_PROFILES, ...extra];
}

let loading: Promise<LoadedFirmwareProfile[]> | undefined;

/**
 * The shipped firmware profiles, loaded once. Startup awaits this so an invalid profile stops
 * Core; request handlers reuse the same result.
 */
export function firmwareProfiles(): Promise<LoadedFirmwareProfile[]> {
  loading ??= loadFirmwareProfiles(profileDirectories());
  return loading;
}

export async function findFirmwareProfile(id: string): Promise<LoadedFirmwareProfile | undefined> {
  return (await firmwareProfiles()).find(({ file }) => file.id === id);
}

export async function findFirmwareProfileForLine(line: string): Promise<LoadedFirmwareProfile | undefined> {
  return (await firmwareProfiles()).find(({ file }) => file.firmware.line === line);
}

export async function defaultFirmwareProfile(): Promise<LoadedFirmwareProfile> {
  const profiles = await firmwareProfiles();
  // The loader guarantees exactly one default.
  return profiles.find(({ file }) => file.default) ?? (profiles[0] as LoadedFirmwareProfile);
}
