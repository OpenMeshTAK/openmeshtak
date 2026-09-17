import type { ImportReport } from "./package-import.dto.js";
import type { PackageGeometry, PackageObjectStyle, TakMarker } from "./package-object.dto.js";

/** One object an import would create, after conversion and validation. */
export interface ImportCandidate {
  name: string;
  description: string | null;
  geometry: PackageGeometry;
  style: PackageObjectStyle;
  /** Markers only; `null` for plain spot markers and shapes. */
  tak: TakMarker | null;
}

/** Result of converting one import file, before anything is saved. */
export interface ImportConversion {
  candidates: ImportCandidate[];
  report: Omit<ImportReport, "accepted">;
}

export function emptyConversion(): ImportConversion {
  return { candidates: [], report: { changed: [], skipped: [], rejected: [] } };
}
