import type { Uuid } from "../../shared/http/uuid.js";
import type { PageInfo } from "../../shared/pagination/cursor.js";

export interface MissionDto {
  id: Uuid;
  eventId: Uuid;
  name: string;
  description: string | null;
  /** Number of the newest published revision, or `null` while nothing is published. */
  latestRevision: number | null;
  /** Optimistic-concurrency version; send it back unchanged with updates. */
  version: number;
  /** @format date-time */
  createdAt: string;
  /** @format date-time */
  updatedAt: string;
}

export interface MissionPage {
  items: MissionDto[];
  page: PageInfo;
}

export interface CreateMissionRequest {
  /**
   * @minLength 1
   * @maxLength 100
   */
  name: string;
  /** @maxLength 1000 */
  description?: string | null;
}

export interface UpdateMissionRequest {
  /**
   * Version the client last read.
   * @isInt
   * @minimum 1
   */
  version: number;
  /**
   * @minLength 1
   * @maxLength 100
   */
  name: string;
  /** @maxLength 1000 */
  description: string | null;
}

export interface MissionLayerDto {
  id: Uuid;
  missionId: Uuid;
  name: string;
  /** Drawing and export order; lower values are drawn first. */
  sortOrder: number;
  /** Editor display only; hidden layers are still published. */
  visible: boolean;
  /** Locked layers reject object changes until they are unlocked. */
  locked: boolean;
  version: number;
  /** @format date-time */
  createdAt: string;
  /** @format date-time */
  updatedAt: string;
}

export interface MissionLayerPage {
  items: MissionLayerDto[];
  page: PageInfo;
}

export interface CreateMissionLayerRequest {
  /**
   * @minLength 1
   * @maxLength 100
   */
  name: string;
}

export interface UpdateMissionLayerRequest {
  /**
   * @isInt
   * @minimum 1
   */
  version: number;
  /**
   * @minLength 1
   * @maxLength 100
   */
  name: string;
  /**
   * @isInt
   * @minimum 0
   * @maximum 10000
   */
  sortOrder: number;
  visible: boolean;
  locked: boolean;
}
