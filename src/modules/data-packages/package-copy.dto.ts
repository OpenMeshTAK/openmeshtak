import type { CombinedExportSelection } from "./combined-export.dto.js";

export interface CreateDataPackageCopyRequest {
  /**
   * @minLength 1
   * @maxLength 100
   */
  name: string;
  /** @maxLength 1000 */
  description?: string | null;
  /**
   * Published package revisions and optional layer selections to copy.
   * @minItems 1
   * @maxItems 100
   */
  packages: CombinedExportSelection[];
}
