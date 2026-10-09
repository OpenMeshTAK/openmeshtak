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

/** When the built-in TAK server installs the package on members' TAK apps by itself. */
export interface PackageTakDelivery {
  /** Right after a member enrolls a TAK app. */
  onEnrollment: boolean;
  /** Whenever a member's TAK app connects, if a newer revision exists. */
  onConnection: boolean;
}

export interface UpdatePackageTakDeliveryRequest {
  /**
   * Version the client last read.
   * @isInt
   * @minimum 1
   */
  version: number;
  takDelivery: PackageTakDelivery;
}

export interface DataPackageContentSummary {
  points: number;
  lines: number;
  polygons: number;
  circles: number;
  /** Offline map caches, including nested map packages. */
  offlineMaps: number;
  rubberSheets: number;
}

/**
 * `package`: a Data Package, published as revisions and installed by members. `mission`: an ATAK
 * Data Sync mission edited with the same editor; each revision is synced to subscribed TAK apps.
 */
export type DataPackageKind = "package" | "mission";

export interface DataPackageDto {
  id: Uuid;
  eventId: Uuid;
  kind: DataPackageKind;
  name: string;
  description: string | null;
  /** Number of the newest published revision, or `null` while nothing is published. */
  latestRevision: number | null;
  /**
   * Approximate download size in bytes of the newest revision's ATAK Data Package, or `null`
   * while nothing is published. Counts attached files plus uncompressed CoT.
   */
  latestRevisionSize: number | null;
  /** `true` when publishing would create a new revision: nothing is published yet or the draft differs. */
  hasUnpublishedChanges: boolean;
  /** What the draft holds, by kind. */
  draftContents: DataPackageContentSummary;
  /** Published package revisions whose content was copied into this package's initial draft. */
  sources: DataPackageSourceDto[];
  audience: PackageAudience;
  /** Missions only: who may change the mission from a TAK app; empty for packages. */
  writers: EventAudience;
  takDelivery: PackageTakDelivery;
  /** Drawing order within the event; lower values are drawn first, below higher ones. */
  sortOrder: number;
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
  /** Fixed at creation; `package` when omitted. */
  kind?: DataPackageKind;
}

export interface UpdatePackageWritersRequest {
  /**
   * Version the client last read.
   * @isInt
   * @minimum 1
   */
  version: number;
  writers: EventAudience;
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
