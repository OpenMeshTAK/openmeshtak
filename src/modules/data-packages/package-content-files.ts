import { createHash } from "node:crypto";
import { database } from "../../shared/database/database.js";
import { readBlob } from "../../shared/storage/blob-storage.js";
import type { PackageSnapshotContent } from "./package-snapshot.js";

export interface ContentFile {
  path: string;
  bytes: Uint8Array;
  sha256: string;
}

/**
 * Loads the stored map-content files of a revision and checks them against the size and SHA-256
 * the revision recorded, so an export never ships silently changed or truncated content.
 */
export async function loadContentFiles(contents: readonly PackageSnapshotContent[]): Promise<ContentFile[]> {
  return Promise.all(
    contents.filter((content) => content.kind !== "icon-library").map(async (content) => {
      const blob = await database.storageBlob.findUniqueOrThrow({ where: { id: content.blobId } });
      const bytes = await readBlob(blob.storageKey);
      const sha256 = createHash("sha256").update(bytes).digest("hex");
      if (bytes.length !== content.size || sha256 !== content.sha256) {
        throw new Error(`Stored package content ${content.id} failed its integrity check.`);
      }
      return { path: content.archivePath, bytes, sha256 };
    }),
  );
}

/**
 * Puts files of several packages into one archive. The same file (equal SHA-256) is included
 * once; a different file at an already used path moves below a folder named after its package.
 */
export function mergeContentFiles(parts: ReadonlyArray<{ packageId: string; files: ContentFile[] }>): ContentFile[] {
  const byPath = new Map<string, ContentFile>();
  for (const { packageId, files } of parts) {
    for (const file of files) {
      const existing = byPath.get(file.path);
      if (existing?.sha256 === file.sha256) {
        continue;
      }
      const path = existing === undefined ? file.path : `${packageId}/${file.path}`;
      byPath.set(path, { ...file, path });
    }
  }
  return [...byPath.values()];
}
