import type { Principal } from "../../shared/auth/principal.js";
import { database } from "../../shared/database/database.js";
import { notFoundProblem } from "../../shared/errors/problem-error.js";
import { readBlob } from "../../shared/storage/blob-storage.js";
import { rubberSheetImage, type RubberSheet } from "./atak/rubber-sheet.js";
import { requireDataPackage } from "./data-package-access.js";
import type { PackageContentDto } from "./package-content.dto.js";

function rubberSheetOf(metadata: unknown): RubberSheet | null {
  return (metadata as { rubberSheet?: RubberSheet } | null)?.rubberSheet ?? null;
}

/** The draft's map content, oldest first. Requires `data-packages.read`. */
export async function listPackageContents(
  principal: Principal,
  eventId: string,
  packageId: string,
): Promise<PackageContentDto[]> {
  await requireDataPackage(principal, eventId, packageId, "data-packages.read");
  const contents = await database.packageContent.findMany({
    where: { packageId },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    include: { blob: { select: { size: true } } },
  });
  return contents.map((content) => {
    const sheet = rubberSheetOf(content.metadata);
    return {
      id: content.id,
      layerId: content.layerId,
      kind: content.kind as PackageContentDto["kind"],
      name: sheet?.name ?? content.name,
      size: content.blob.size,
      rubberSheet: sheet === null ? null : { corners: sheet.corners, imageMediaType: sheet.imageMediaType },
    };
  });
}

/**
 * The image of a rubber sheet, read from its stored KMZ for display. The stored file is never
 * exposed directly; only this checked image leaves the server.
 */
export async function rubberSheetImageOf(
  principal: Principal,
  eventId: string,
  packageId: string,
  contentId: string,
): Promise<{ bytes: Uint8Array; mediaType: string }> {
  await requireDataPackage(principal, eventId, packageId, "data-packages.read");
  const content = await database.packageContent.findFirst({
    where: { id: contentId, packageId, kind: "rubber-sheet" },
    include: { blob: true },
  });
  const sheet = rubberSheetOf(content?.metadata ?? null);
  if (content === null || sheet === null) {
    throw notFoundProblem();
  }
  const image = rubberSheetImage(await readBlob(content.blob.storageKey), sheet.imagePath);
  if (image === null) {
    throw notFoundProblem();
  }
  return { bytes: image, mediaType: sheet.imageMediaType };
}
