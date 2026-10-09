import { randomUUID } from "node:crypto";
import { strToU8, zipSync, type Zippable } from "fflate";
import { buildAtakExport } from "../../data-packages/package-atak.service.js";
import { APP_PREFERENCES, preferenceFileXml, type AtakPreference } from "../../tak-configuration/atak-preferences.js";
import type { TakAccess } from "../tak-access.js";
import { visiblePackagesFor, type VisiblePackage } from "./visible-packages.js";

/**
 * Device profiles are ordinary Data Packages that a TAK app installs by itself: once after
 * enrollment and on each connection. Ours carry the member's published packages as nested Data
 * Packages plus the preferences that make the app ask for the connection profile and use the
 * public Marti port, and the ATAK preferences of the member's events.
 *
 * ATAK keeps the Marti port in the application-wide `apiSecureServerPort` preference (default
 * 8443) and learns it from the enrollment profile, fetched on the enrollment port before any
 * Marti request. That is what makes a non-standard public Marti port such as 8484 work without
 * changing the enrollment or CoT ports. ATAK stores the value as a string.
 */
function profilePreferences(martiPort: number, eventPreferences: AtakPreference[]): string {
  const own: AtakPreference[] = [
    { preference: APP_PREFERENCES, key: "deviceProfileEnableOnConnect", type: "boolean", value: "true" },
    { preference: APP_PREFERENCES, key: "apiSecureServerPort", type: "string", value: String(martiPort) },
  ];
  // The event's preferences never contain these keys; listing ours last keeps them decisive anyway.
  return preferenceFileXml([...eventPreferences, ...own]);
}

function escapeXml(value: string): string {
  return value.replace(/[<>&"']/g, (character) => `&#${String(character.charCodeAt(0))};`);
}

/** A version 2 manifest that installs every listed file and deletes the package after the import. */
export function dataPackageManifest(name: string, entries: string[]): string {
  const contents = entries.map((entry) => `    <Content ignore="false" zipEntry="${escapeXml(entry)}"/>`).join("\n");
  return `<MissionPackageManifest version="2">
  <Configuration>
    <Parameter name="uid" value="${randomUUID()}"/>
    <Parameter name="name" value="${escapeXml(name)}"/>
    <Parameter name="onReceiveDelete" value="true"/>
  </Configuration>
  <Contents>
${contents}
  </Contents>
</MissionPackageManifest>
`;
}

export type ProfileKind = "enrollment" | "connection";

/** Packages that belong into a profile: chosen for that moment and, for connections, changed since the last sync. */
export async function profilePackages(userId: string, access: TakAccess, kind: ProfileKind, changedSince: Date | null): Promise<VisiblePackage[]> {
  const visible = await visiblePackagesFor(userId, access);
  return visible.filter(({ dataPackage, latest }) =>
    kind === "enrollment"
      ? dataPackage.installOnEnrollment
      : dataPackage.installOnConnection && (changedSince === null || latest.createdAt > changedSince),
  );
}

/**
 * The profile Data Package, or `null` when there is nothing to install. The enrollment profile is
 * always delivered, because it carries the public Marti port. `eventPreferences` is `null` when a
 * connection profile has no changed event preferences to deliver.
 */
export async function buildDeviceProfile(
  kind: ProfileKind,
  packages: VisiblePackage[],
  martiPort: number,
  eventPreferences: AtakPreference[] | null = null,
): Promise<Uint8Array | null> {
  if (kind === "connection" && packages.length === 0 && eventPreferences === null) {
    return null;
  }
  const files: Zippable = { "preferences/preference.pref": strToU8(profilePreferences(martiPort, eventPreferences ?? [])) };
  for (const item of packages) {
    const artifact = await buildAtakExport(item.dataPackage.id, item.latest);
    files[`packages/${item.dataPackage.id}/${artifact.fileName}`] = artifact.bytes;
  }
  files["MANIFEST/manifest.xml"] = strToU8(dataPackageManifest(`OpenMeshTak ${kind} profile`, Object.keys(files).filter((path) => !path.startsWith("MANIFEST/"))));
  return zipSync(files, { level: 6 });
}
