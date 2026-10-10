import type { DataPackageKind } from "./data-package.dto.js";
import type { CombinedExportSelection } from "./combined-export.dto.js";

export interface CreateDataPackageCopyRequest {
  /**
   * @minLength 1
   * @maxLength 100
   */
  name: string;
  /** @maxLength 1000 */
  description?: string | null;
  /** The kind of the new package, e.g. `mission` to start a mission from published packages; `package` when omitted. */
  kind?: DataPackageKind;
  /** Copy current drafts explicitly; defaults to immutable published revisions. Draft selections cannot specify revision numbers. */
  source?: "published" | "draft";
  /**
   * Source packages and optional layer selections to copy.
   * @minItems 1
   * @maxItems 100
   */
  packages: CombinedExportSelection[];
}
