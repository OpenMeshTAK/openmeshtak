import type { Uuid } from "../../shared/http/uuid.js";
import type { ImportReportEntry } from "./package-import.dto.js";

/** Operator-provided PNG icon, identified by its original TAK path. */
export interface PackageIconDto {
  id: Uuid;
  path: string;
  setName: string;
  group: string;
  filename: string;
  cotType: string | null;
  width: number;
  height: number;
}

export interface IconLibraryImportResult {
  contentId: Uuid;
  accepted: number;
  rejected: ImportReportEntry[];
}
