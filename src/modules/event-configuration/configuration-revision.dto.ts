import type { Uuid } from "../../shared/http/uuid.js";
import type { PageInfo } from "../../shared/pagination/cursor.js";
import type { ConfigurationSnapshot } from "./configuration-snapshot.js";

export type ConfigurationRevisionReason = "activation" | "reactivation" | "publish";

export interface ConfigurationRevisionSummaryDto {
  id: Uuid;
  eventId: Uuid;
  /** Increments per event, starting at 1. */
  number: number;
  reason: ConfigurationRevisionReason;
  /** @format date-time */
  createdAt: string;
}

export interface ConfigurationRevisionDto extends ConfigurationRevisionSummaryDto {
  snapshot: ConfigurationSnapshot;
}

export interface ConfigurationRevisionPage {
  items: ConfigurationRevisionSummaryDto[];
  page: PageInfo;
}

export type ConfigurationChangeArea = "event" | "roles" | "groups" | "channels" | "meshtastic" | "tak";
export type ConfigurationChangeKind = "added" | "removed" | "changed";

export interface ConfigurationChangeDto {
  area: ConfigurationChangeArea;
  kind: ConfigurationChangeKind;
  /** Name of the role, group or channel, a Meshtastic setting key, or a short description. */
  name: string;
  /** Dotted paths of the changed fields of a changed item; empty otherwise. */
  fields: string[];
}

export interface PendingConfigurationChangesDto {
  /** Number of the revision participants receive; `null` before the first one. */
  publishedRevision: number | null;
  /**
   * What publishing would change. Empty when nothing is pending, and always empty for drafts
   * (activation publishes) and archived events (read-only).
   */
  changes: ConfigurationChangeDto[];
}

export interface PublishConfigurationResponse {
  /** `false` when the configuration was unchanged and the latest revision is returned instead. */
  created: boolean;
  revision: ConfigurationRevisionDto;
}
