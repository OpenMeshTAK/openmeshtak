import type { Uuid } from "../../shared/http/uuid.js";
import type { PageInfo } from "../../shared/pagination/cursor.js";
import type { PackageSnapshot } from "./package-snapshot.js";

export interface PackageRevisionSummaryDto {
  id: Uuid;
  packageId: Uuid;
  /** Increments per data package, starting at 1. */
  number: number;
  /** SHA-256 of the canonical snapshot, for provenance. */
  snapshotHash: string;
  /** @format date-time */
  createdAt: string;
}

export interface PackageRevisionDto extends PackageRevisionSummaryDto {
  snapshot: PackageSnapshot;
}

export interface PackageRevisionPage {
  items: PackageRevisionSummaryDto[];
  page: PageInfo;
}

export interface PublishDataPackageResponse {
  /** `false` when the draft equals the latest revision, which is returned instead. */
  created: boolean;
  revision: PackageRevisionDto;
}
