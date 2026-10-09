import type { Uuid } from "../../shared/http/uuid.js";

export interface BaseMapFields {
  /**
   * @minLength 1
   * @maxLength 100
   */
  providerName: string;
  /**
   * @minLength 1
   * @maxLength 500
   */
  tileUrlTemplate: string;
  /**
   * @minLength 1
   * @maxLength 300
   */
  attribution: string;
  /**
   * @isInt
   * @minimum 1
   * @maximum 22
   */
  maxZoom: number;
}

/** One mutually exclusive XYZ base map; package overlays remain separate. */
export interface BaseMapLayerDto extends BaseMapFields {
  id: Uuid;
}

/** Legacy top-level fields mirror the default layer. */
export interface MapSettingsDto extends BaseMapFields {
  /** Optimistic-concurrency version; 0 while the default is in use. */
  version: number;
  layers: BaseMapLayerDto[];
  defaultLayerId: Uuid;
}

export interface UpdateMapSettingsRequest extends BaseMapFields {
  /**
   * @isInt
   * @minimum 0
   */
  version: number;
  /** Omit to update only the existing default layer, preserving other layers.
   * @minItems 1
   * @maxItems 10
   */
  layers?: BaseMapLayerDto[];
  /** Must refer to a supplied layer; otherwise the first supplied layer is the default. */
  defaultLayerId?: Uuid;
}
