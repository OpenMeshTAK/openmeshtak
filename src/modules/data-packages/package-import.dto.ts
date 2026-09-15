/** Untrusted GeoJSON document: a FeatureCollection, a Feature or a bare geometry. */
export interface GeoJsonDocument {
  type: string;
  [key: string]: unknown;
}

export interface ImportReportEntry {
  /** Which input feature this is about, e.g. `Feature 3 (Rally point)`. */
  feature: string;
  message: string;
}

export interface GeoJsonImportReport {
  /** Number of objects created. */
  accepted: number;
  /** Imported, but adjusted: split multi-geometries, clamped styles. */
  changed: ImportReportEntry[];
  /** Not imported because the content type is not supported, e.g. GeometryCollection. */
  skipped: ImportReportEntry[];
  /** Not imported because the content is invalid, e.g. a self-intersecting polygon. */
  rejected: ImportReportEntry[];
}

/** GeoJSON FeatureCollection exported from a data package draft or revision. */
export interface GeoJsonFeatureCollection {
  type: "FeatureCollection";
  features: unknown[];
}
