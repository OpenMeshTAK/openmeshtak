/** The Web map's online base map. Defaults to OpenStreetMap until an administrator changes it. */
export interface MapSettingsDto {
  providerName: string;
  /** XYZ tile URL with `{z}`, `{x}` and `{y}`; `{a-c}` selects subdomains. */
  tileUrlTemplate: string;
  /** Plain-text attribution the provider requires; the Web app shows it on every map. */
  attribution: string;
  maxZoom: number;
  /** Optimistic-concurrency version; 0 while the default is in use. */
  version: number;
}

export interface UpdateMapSettingsRequest {
  /**
   * @isInt
   * @minimum 0
   */
  version: number;
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
