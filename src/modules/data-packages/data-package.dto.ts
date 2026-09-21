import type { EventAudience } from "../event-audience/event-audience.js";
import type { Uuid } from "../../shared/http/uuid.js";
import type { PageInfo } from "../../shared/pagination/cursor.js";

/**
 * Who receives the published Data Package: every event member, or only those matching any
 * selected group, role or member. The selection is ignored while `allMembers` is true.
 */
export interface PackageAudience extends EventAudience {
  allMembers: boolean;
}

export interface UpdatePackageAudienceRequest {
  /**
   * Version the client last read.
   * @isInt
   * @minimum 1
   */
  version: number;
  audience: PackageAudience;
}

export interface DataPackageDto {
  id: Uuid;
  eventId: Uuid;
  name: string;
  description: string | null;
  /** Number of the newest published revision, or `null` while nothing is published. */
  latestRevision: number | null;
  /** Published package revisions whose content was copied into this package's initial draft. */
  sources: DataPackageSourceDto[];
  audience: PackageAudience;
  /** Optimistic-concurrency version; send it back unchanged with updates. */
  version: number;
  /** @format date-time */
  createdAt: string;
  /** @format date-time */
  updatedAt: string;
}

export interface DataPackageSourceDto {
  id: Uuid;
  sourcePackageId: Uuid;
  sourcePackageName: string;
  sourceRevision: number;
  sourceSnapshotHash: string;
  sourceLayerIds: Uuid[];
  /** @format date-time */
  createdAt: string;
}

export interface DataPackagePage {
  items: DataPackageDto[];
  page: PageInfo;
}

export interface CreateDataPackageRequest {
  /**
   * @minLength 1
   * @maxLength 100
   */
  name: string;
  /** @maxLength 1000 */
  description?: string | null;
}

export interface UpdateDataPackageRequest {
  /**
   * Version the client last read.
   * @isInt
   * @minimum 1
   */
  version: number;
  /**
   * @minLength 1
   * @maxLength 100
   */
  name: string;
  /** @maxLength 1000 */
  description: string | null;
}

export interface PackageLayerDto {
  id: Uuid;
  packageId: Uuid;
  name: string;
  /** Drawing and export order; lower values are drawn first. */
  sortOrder: number;
  /** Editor display only; hidden layers are still published. */
  visible: boolean;
  /** Locked layers reject object changes until they are unlocked. */
  locked: boolean;
  version: number;
  /** @format date-time */
  createdAt: string;
  /** @format date-time */
  updatedAt: string;
}

export interface PackageLayerPage {
  items: PackageLayerDto[];
  page: PageInfo;
}

export interface CreatePackageLayerRequest {
  /**
   * @minLength 1
   * @maxLength 100
   */
  name: string;
}

export interface UpdatePackageLayerRequest {
  /**
   * @isInt
   * @minimum 1
   */
  version: number;
  /**
   * @minLength 1
   * @maxLength 100
   */
  name: string;
  /**
   * @isInt
   * @minimum 0
   * @maximum 10000
   */
  sortOrder: number;
  visible: boolean;
  locked: boolean;
}
