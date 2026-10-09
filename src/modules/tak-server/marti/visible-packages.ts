import { createHash } from "node:crypto";
import type { DataPackage, PackageRevision } from "../../../generated/prisma/client.js";
import { database } from "../../../shared/database/database.js";
import { buildAtakExport, type AtakExport } from "../../data-packages/package-atak.service.js";
import { receivedPackages } from "../../member-data-packages/member-data-packages.service.js";
import type { TakAccess } from "../tak-access.js";

export interface VisiblePackage {
  dataPackage: DataPackage;
  latest: PackageRevision;
}

/**
 * The newest published revision of every package a TAK user may download: for members exactly
 * the packages of their audience in their active events, the same rule as the Web download; for
 * TAK administrators every published package.
 */
export async function visiblePackagesFor(userId: string, access: TakAccess): Promise<VisiblePackage[]> {
  if (access.admin) {
    const packages = await database.dataPackage.findMany({
      where: { kind: "package", revisions: { some: {} } },
      orderBy: { name: "asc" },
      include: { revisions: { orderBy: { number: "desc" }, take: 1 } },
    });
    return packages.flatMap(({ revisions, ...dataPackage }) => (revisions[0] === undefined ? [] : [{ dataPackage, latest: revisions[0] }]));
  }
  const memberships = await database.eventMember.findMany({
    where: { userId, eventId: { in: access.eventIds } },
    select: { id: true, eventId: true, eventRoleId: true, eventGroupId: true },
  });
  const visible = new Map<string, VisiblePackage>();
  for (const member of memberships) {
    const received = await receivedPackages(member.eventId, {
      memberId: member.id,
      eventRoleId: member.eventRoleId,
      eventGroupId: member.eventGroupId,
    });
    for (const { dataPackage, latest } of received) {
      visible.set(dataPackage.id, { dataPackage, latest });
    }
  }
  return [...visible.values()];
}

export interface ExportSummary {
  sha256: string;
  size: number;
  fileName: string;
}

/**
 * Revisions are immutable and the export is deterministic, so its hash and size are computed once
 * per revision and process. TAK apps address packages by that hash.
 */
const summaries = new Map<string, ExportSummary>();

export async function exportSummary(visible: VisiblePackage): Promise<ExportSummary> {
  const cached = summaries.get(visible.latest.id);
  if (cached !== undefined) {
    return cached;
  }
  const artifact = await buildAtakExport(visible.dataPackage.id, visible.latest);
  const summary = summaryOf(artifact);
  summaries.set(visible.latest.id, summary);
  return summary;
}

function summaryOf(artifact: AtakExport): ExportSummary {
  return {
    sha256: createHash("sha256").update(artifact.bytes).digest("hex"),
    size: artifact.bytes.byteLength,
    fileName: artifact.fileName,
  };
}
