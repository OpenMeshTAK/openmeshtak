import { objectToCotEvents } from "./atak/cot-export.js";
import type { PackageSnapshot } from "./package-snapshot.js";

/**
 * Estimates a revision's ATAK download size without building the zip: attached files plus the
 * uncompressed CoT. Files dominate and are stored as-is, so the real archive is close or smaller.
 */
export function estimateAtakExportSize(snapshot: PackageSnapshot, publishedAt: Date): number {
  const files = (snapshot.contents ?? []).filter((content) => content.kind !== "icon-library").reduce((total, content) => total + content.size, 0);
  const cot = snapshot.objects.reduce(
    (total, object) => total + objectToCotEvents(object, publishedAt).reduce((size, { xml }) => size + Buffer.byteLength(xml, "utf8"), 0),
    0,
  );
  return files + cot;
}
