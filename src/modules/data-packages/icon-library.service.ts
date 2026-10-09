import { createHash, randomUUID } from "node:crypto";
import type { Prisma } from "../../generated/prisma/client.js";
import { recordAudit } from "../../shared/audit/audit.js";
import type { ActorContext, Principal } from "../../shared/auth/principal.js";
import { database } from "../../shared/database/database.js";
import { notFoundProblem, ProblemError } from "../../shared/errors/problem-error.js";
import { removeBlob, writeBlob } from "../../shared/storage/blob-storage.js";
import { readIconDatabase } from "./atak/icon-database.js";
import { readIconArchiveImage } from "./atak/icon-archive.js";
import { requireDataPackage } from "./data-package-access.js";
import type { IconLibraryImportResult, PackageIconDto } from "./icon-library.dto.js";
import { requireImportTarget } from "./package-import.service.js";
import { clearDraftHash } from "./package-state.js";

/** Uses package-content lifecycle, copying and cleanup; this library is editor content only. */
export async function importIconLibrary(actor: ActorContext, eventId: string, packageId: string, layerId: string, bytes: Uint8Array): Promise<IconLibraryImportResult> {
  await requireImportTarget(actor, eventId, packageId, layerId);
  const parsed = await readIconDatabase(bytes);
  const storageKey = await writeBlob(parsed.bytes);
  const contentId = randomUUID();
  try {
    await database.$transaction(async (transaction) => {
      if (await transaction.packageContent.count({ where: { packageId, kind: "icon-library" } }) >= 10) {
        throw new ProblemError({ type: "urn:openmeshtak:problem:too-many-icon-libraries", title: "Too many icon libraries", status: 409, code: "TOO_MANY_ICON_LIBRARIES", detail: "Remove an existing icon library before uploading another (maximum 10 per package)." });
      }
      const blob = await transaction.storageBlob.create({ data: { id: randomUUID(), storageKey, sha256: createHash("sha256").update(parsed.bytes).digest("hex"), size: parsed.bytes.length, mediaType: "application/zip" } });
      await transaction.packageContent.create({ data: {
        id: contentId, packageId, layerId, blobId: blob.id, kind: "icon-library", name: "WinTAK icons",
        archivePath: `editor-icons/${contentId}.zip`, metadata: { icons: parsed.icons } as unknown as Prisma.InputJsonValue,
      } });
      await clearDraftHash(transaction, packageId);
      await recordAudit({ actor: actor.principal, action: "data-package.icons-imported", targetType: "data-package", targetId: packageId, result: "success", traceId: actor.traceId, metadata: { eventId, layerId, contentId, accepted: parsed.icons.length, rejected: parsed.rejected.length } }, transaction);
    });
  } catch (error: unknown) {
    await removeBlob(storageKey);
    throw error;
  }
  return { contentId, accepted: parsed.icons.length, rejected: parsed.rejected };
}

async function libraryOf(principal: Principal, eventId: string, packageId: string, contentId: string) {
  await requireDataPackage(principal, eventId, packageId, "data-packages.read");
  const library = await database.packageContent.findFirst({ where: { id: contentId, packageId, kind: "icon-library" }, include: { blob: true } });
  if (library === null) throw notFoundProblem();
  return library;
}

export async function listPackageIcons(principal: Principal, eventId: string, packageId: string, contentId: string): Promise<PackageIconDto[]> {
  const library = await libraryOf(principal, eventId, packageId, contentId);
  return (library.metadata as unknown as { icons: PackageIconDto[] }).icons;
}

export async function packageIconImage(principal: Principal, eventId: string, packageId: string, contentId: string, iconId: string): Promise<Uint8Array> {
  const library = await libraryOf(principal, eventId, packageId, contentId);
  const icons = (library.metadata as unknown as { icons: PackageIconDto[] }).icons;
  if (!icons.some(({ id }) => id === iconId)) throw notFoundProblem();
  return readIconArchiveImage(library.blob.storageKey, library.blob.sha256, iconId);
}
