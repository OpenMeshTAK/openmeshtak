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

export interface PublishConfigurationResponse {
  /** `false` when the configuration was unchanged and the latest revision is returned instead. */
  created: boolean;
  revision: ConfigurationRevisionDto;
}
