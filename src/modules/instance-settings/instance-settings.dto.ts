/** How this installation presents itself. Public, because the sign-in page shows it. */
export interface InstanceSettingsDto {
  /** Shown as the browser page title, on the sign-in page and in account emails. */
  name: string;
  /** Optimistic-concurrency version; 0 while the default is in use. */
  version: number;
}

export interface UpdateInstanceSettingsRequest {
  /**
   * @isInt
   * @minimum 0
   */
  version: number;
  /**
   * @minLength 1
   * @maxLength 60
   */
  name: string;
}
