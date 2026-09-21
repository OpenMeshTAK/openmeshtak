import type { Uuid } from "../../shared/http/uuid.js";

export interface CombinedExportSelection {
  packageId: Uuid;
  /**
   * Published revision to use; omit for the newest one.
   * @isInt
   * @minimum 1
   */
  revision?: number;
  /**
   * Only these layers of the package; omit for all layers.
   * @maxItems 100
   */
  layerIds?: Uuid[];
}

export interface CombinedExportRequest {
  /**
   * Name of the combined Data Package; defaults to the event name.
   * @minLength 1
   * @maxLength 100
   */
  name?: string;
  /**
   * @minItems 1
   * @maxItems 100
   */
  packages: CombinedExportSelection[];
}

export interface CombinedExportIncluded {
  packageId: Uuid;
  name: string;
  revision: number;
  objects: number;
}

export interface CombinedExportSkipped {
  packageId: Uuid;
  name: string;
  /** `not-published`: the package has no published revision yet. */
  reason: "not-published";
}

/** An object name used in more than one included package; both objects are kept. */
export interface CombinedExportNameClash {
  name: string;
  packageIds: Uuid[];
}

export interface CombinedExportReport {
  included: CombinedExportIncluded[];
  skipped: CombinedExportSkipped[];
  nameClashes: CombinedExportNameClash[];
}
