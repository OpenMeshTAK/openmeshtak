import type { PackageIconDto } from "../data-packages/icon-library.dto.js";
import type { ImportReportEntry } from "../data-packages/package-import.dto.js";

export interface IconSettingsDto {
  /** Optimistic-concurrency version; 0 until the first upload. */
  version: number;
  icons: number;
  sets: number;
  groups: number;
  updatedAt: string | null;
}

export interface InstanceIconCatalogue {
  version: number;
  icons: PackageIconDto[];
}

export interface UpdateIconSettingsResult {
  settings: IconSettingsDto;
  accepted: number;
  rejected: ImportReportEntry[];
}
