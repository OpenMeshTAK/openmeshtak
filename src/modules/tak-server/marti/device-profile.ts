import { randomUUID } from "node:crypto";
import { strToU8, zipSync, type Zippable } from "fflate";
import { buildAtakExport } from "../../data-packages/package-atak.service.js";
import type { TakAccess } from "../tak-access.js";
import { visiblePackagesFor, type VisiblePackage } from "./visible-packages.js";

/**
 * Device profiles are ordinary Data Packages that a TAK app installs by itself: once after
 * enrollment and on each connection. Ours carry the member's published packages as nested Data
 * Packages plus the preferences that make the app ask for the connection profile and use the
 * public Marti port.
 *
 * ATAK keeps the Marti port in the application-wide `apiSecureServerPort` preference (default
 * 8443) and learns it from the enrollment profile, fetched on the enrollment port before any
 * Marti request. That is what makes a non-standard public Marti port such as 8484 work without
 * changing the enrollment or CoT ports. ATAK stores the value as a string.
 */
function profilePreferences(martiPort: number): string {
  return `<?xml version="1.0" standalone="yes"?>
<preferences>
  <preference version="1" name="com.atakmap.app_preferences">
    <entry key="deviceProfileEnableOnConnect" class="class java.lang.Boolean">true</entry>
    <entry key="apiSecureServerPort" class="class java.lang.String">${String(martiPort)}</entry>
  </preference>
</preferences>
`;
}

function escapeXml(value: string): string {
  return value.replace(/[<>&"']/g, (character) => `&#${String(character.charCodeAt(0))};`);
}

function manifest(name: string, entries: string[]): string {
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
 * always delivered, because it carries the public Marti port.
 */
export async function buildDeviceProfile(kind: ProfileKind, packages: VisiblePackage[], martiPort: number): Promise<Uint8Array | null> {
  if (kind === "connection" && packages.length === 0) {
    return null;
  }
  const files: Zippable = { "preferences/preference.pref": strToU8(profilePreferences(martiPort)) };
  for (const item of packages) {
    const artifact = await buildAtakExport(item.dataPackage.id, item.latest);
    files[`packages/${item.dataPackage.id}/${artifact.fileName}`] = artifact.bytes;
  }
  files["MANIFEST/manifest.xml"] = strToU8(manifest(`OpenMeshTak ${kind} profile`, Object.keys(files).filter((path) => !path.startsWith("MANIFEST/"))));
  return zipSync(files, { level: 6 });
}
