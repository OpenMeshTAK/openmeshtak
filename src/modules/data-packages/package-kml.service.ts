import type { Principal } from "../../shared/auth/principal.js";
import { database } from "../../shared/database/database.js";
import { requireDataPackage } from "./data-package-access.js";
import { snapshotToKml } from "./kml-export.js";
import { exportedSnapshot, findRevision } from "./package-import.service.js";
import { buildPackageSnapshot, type PackageSnapshot } from "./package-snapshot.js";

export interface KmlExport {
  fileName: string;
  kml: string;
}

function exportOf(snapshot: PackageSnapshot, suffix: string): KmlExport {
  const safeName = snapshot.name.replace(/[^\w.-]+/g, "_").slice(0, 80) || "data-package";
  return { fileName: `${safeName}${suffix}.kml`, kml: snapshotToKml(snapshot) };
}

export async function exportDraftKml(principal: Principal, eventId: string, packageId: string, layerId?: string): Promise<KmlExport> {
  await requireDataPackage(principal, eventId, packageId, "data-packages.read");
  return exportOf(exportedSnapshot(await buildPackageSnapshot(database, packageId), layerId), "-draft");
}

export async function exportRevisionKml(
  principal: Principal,
  eventId: string,
  packageId: string,
  number: number,
  layerId?: string,
): Promise<KmlExport> {
  await requireDataPackage(principal, eventId, packageId, "data-packages.read");
  const revision = await findRevision(packageId, number);
  return exportOf(exportedSnapshot(revision.snapshot as unknown as PackageSnapshot, layerId), `-r${String(number)}`);
}
