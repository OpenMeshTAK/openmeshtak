import type { Uuid } from "../../shared/http/uuid.js";
import type { PageInfo } from "../../shared/pagination/cursor.js";
import type { MissionSnapshot } from "./mission-snapshot.js";

export interface MissionRevisionSummaryDto {
  id: Uuid;
  missionId: Uuid;
  /** Increments per mission, starting at 1. */
  number: number;
  /** SHA-256 of the canonical snapshot, for provenance. */
  snapshotHash: string;
  /** @format date-time */
  createdAt: string;
}

export interface MissionRevisionDto extends MissionRevisionSummaryDto {
  snapshot: MissionSnapshot;
}

export interface MissionRevisionPage {
  items: MissionRevisionSummaryDto[];
  page: PageInfo;
}

export interface PublishMissionResponse {
  /** `false` when the draft equals the latest revision, which is returned instead. */
  created: boolean;
  revision: MissionRevisionDto;
}
