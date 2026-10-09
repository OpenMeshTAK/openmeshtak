import type { Uuid } from "../../shared/http/uuid.js";

export interface RubberSheetDto {
  /**
   * Lower left, lower right, upper right and upper left corner as [longitude, latitude] in
   * WGS84, as ATAK placed the image.
   */
  corners: number[][];
  imageMediaType: "image/png" | "image/jpeg";
}

export interface OfflineMapDto {
  minZoom: number;
  maxZoom: number;
  /** West, south, east, north in WGS84 degrees. */
  bounds: number[];
  tiles: number;
}

/** Imported map content (exported unchanged), or an operator-provided editor-only icon library. */
export interface PackageContentDto {
  id: Uuid;
  layerId: Uuid;
  kind: "offline-map" | "nested-data-package" | "rubber-sheet" | "icon-library";
  name: string;
  /** Size of the stored file in bytes. */
  size: number;
  /** Placement for display; only for rubber sheets. */
  rubberSheet: RubberSheetDto | null;
  /** Tile range for display; only for offline maps that could be read. */
  offlineMap: OfflineMapDto | null;
  /** Editor display only; the exported file is always unchanged. */
  visible: boolean;
  /** Editor display opacity from 0 to 1. */
  opacity: number;
  /** Optimistic-concurrency version; send it back unchanged with updates. */
  version: number;
}

export interface UpdatePackageContentRequest {
  /**
   * @isInt
   * @minimum 1
   */
  version: number;
  /**
   * @minLength 1
   * @maxLength 200
   */
  name: string;
  /** Moves the content to another layer of the same package. */
  layerId: string;
  visible: boolean;
  /**
   * @minimum 0
   * @maximum 1
   */
  opacity: number;
}
