import { randomUUID } from "node:crypto";
import { strToU8, zipSync, type Zippable } from "fflate";
import { buildAtakExport } from "../../data-packages/package-atak.service.js";
import type { TakAccess } from "../tak-access.js";
import { visiblePackagesFor, type VisiblePackage } from "./visible-packages.js";

/**
 * Device profiles are ordinary Data Packages that a TAK app installs by itself: once after
 * enrollment and on each connection. Ours carry the member's published packages as nested Data
 * Packages plus the preference that makes the app ask for the connection profile.
 */
const PROFILE_PREFERENCES = `<?xml version="1.0" standalone="yes"?>
<preferences>
  <preference version="1" name="com.atakmap.app_preferences">
    <entry key="deviceProfileEnableOnConnect" class="class java.lang.Boolean">true</entry>
  </preference>
</preferences>
`;

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

/** The profile Data Package, or `null` when there is nothing to install. */
export async function buildDeviceProfile(kind: ProfileKind, packages: VisiblePackage[]): Promise<Uint8Array | null> {
  if (kind === "connection" && packages.length === 0) {
    return null;
  }
  const files: Zippable = { "preferences/preference.pref": strToU8(PROFILE_PREFERENCES) };
  for (const item of packages) {
    const artifact = await buildAtakExport(item.dataPackage.id, item.latest);
    files[`packages/${item.dataPackage.id}/${artifact.fileName}`] = artifact.bytes;
  }
  files["MANIFEST/manifest.xml"] = strToU8(manifest(`OpenMeshTak ${kind} profile`, Object.keys(files).filter((path) => !path.startsWith("MANIFEST/"))));
  return zipSync(files, { level: 6 });
}
