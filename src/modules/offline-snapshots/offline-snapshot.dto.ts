import type { Uuid } from "../../shared/http/uuid.js";
import type { PageInfo } from "../../shared/pagination/cursor.js";
import type { DataPackageKind } from "../data-packages/data-package.dto.js";
import type { PackageSnapshotLayer, PackageSnapshotObject } from "../data-packages/package-snapshot.js";

export interface OfflineSnapshotSelection {
  packageId: Uuid;
  /**
   * Published revision to take; the newest one when omitted.
   * @isInt
   * @minimum 1
   */
  revision?: number;
}

export interface CreateOfflineSnapshotRequest {
  /**
   * Published Data Packages or missions to make available offline.
   * @minItems 1
   * @maxItems 50
   */
  packages: OfflineSnapshotSelection[];
}

/** An ATAK tile cache of the revision, copied tile by tile through the tiles endpoint. */
export interface OfflineTileContentDto {
  id: Uuid;
  layerId: Uuid;
  kind: "tiles";
  name: string;
  minZoom: number;
  maxZoom: number;
  /** West, south, east, north in WGS84 degrees. */
  bounds: number[];
  tiles: number;
  /** Size of the stored cache in bytes; the tiles alone usually need less. */
  size: number;
}

/** A rubber sheet of the revision, downloaded as one image through the image endpoint. */
export interface OfflineImageContentDto {
  id: Uuid;
  layerId: Uuid;
  kind: "image";
  name: string;
  /** Lower left, lower right, upper right and upper left corner as [longitude, latitude]. */
  corners: number[][];
  mediaType: "image/png" | "image/jpeg";
  /** SHA-256 of the image bytes, checked by the browser after the download. */
  sha256: string;
  size: number;
}

export type OfflineContentDto = OfflineTileContentDto | OfflineImageContentDto;

/** Content of the revision that the offline view cannot show, listed so nothing is dropped silently. */
export interface OfflineSkippedContentDto {
  id: Uuid;
  name: string;
  kind: string;
  reason: "not-displayable" | "unreadable";
}

export interface OfflineSnapshotPackageDto {
  packageId: Uuid;
  kind: DataPackageKind;
  name: string;
  revision: number;
  revisionId: Uuid;
  /** SHA-256 of the published revision snapshot, for provenance. */
  snapshotHash: string;
  /** @format date-time */
  publishedAt: string;
  layers: PackageSnapshotLayer[];
  objects: PackageSnapshotObject[];
  contents: OfflineContentDto[];
  skippedContents: OfflineSkippedContentDto[];
}

/**
 * Everything the browser stores for the offline HQ view of one event: published revisions only,
 * never drafts, credentials, certificates, channel keys or member data.
 */
export interface OfflineSnapshotDto {
  /** Version of this document; the browser refuses formats it does not know. */
  format: number;
  event: { id: Uuid; name: string; timeZone: string };
  /** @format date-time */
  preparedAt: string;
  packages: OfflineSnapshotPackageDto[];
  /** Selected packages without a published revision. */
  skippedPackages: Array<{ packageId: Uuid; name: string; reason: "not-published" }>;
  /** Approximate bytes the browser has to store: tile caches plus images. */
  estimatedBytes: number;
}

export interface OfflineTileDto {
  z: number;
  x: number;
  y: number;
  mediaType: "image/png" | "image/jpeg";
  /** Base64-encoded tile image. */
  data: string;
  /** SHA-256 of the decoded tile bytes, checked by the browser. */
  sha256: string;
}

export interface OfflineTilePage {
  items: OfflineTileDto[];
  page: PageInfo;
}
