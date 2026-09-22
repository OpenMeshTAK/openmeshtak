import type { Uuid } from "../../shared/http/uuid.js";

export interface RubberSheetDto {
  /**
   * Lower left, lower right, upper right and upper left corner as [longitude, latitude] in
   * WGS84, as ATAK placed the image.
   */
  corners: number[][];
  imageMediaType: "image/png" | "image/jpeg";
}

/** Map content kept from an imported ATAK Data Package; exported unchanged with its layer. */
export interface PackageContentDto {
  id: Uuid;
  layerId: Uuid;
  kind: "offline-map" | "nested-data-package" | "rubber-sheet";
  name: string;
  /** Size of the stored file in bytes. */
  size: number;
  /** Placement for display; only for rubber sheets. */
  rubberSheet: RubberSheetDto | null;
}
