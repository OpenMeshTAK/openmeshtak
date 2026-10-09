import type { Uuid } from "../../shared/http/uuid.js";

/** One recorded position on a track. */
export interface TakTrackPointDto {
  /**
   * When the sender says the position was taken.
   * @format date-time
   */
  time: string;
  lat: number;
  lon: number;
  /** Circular error in metres, or null when the sender did not say. */
  ce: number | null;
  /** Reached Core more than a minute after its own time, for example relayed over a mesh. */
  delayed: boolean;
  /** A large circular error or a human estimate; never connected to other positions. */
  approximate: boolean;
}

/** The OpenMeshTak user whose TAK app sent a track, with their event group when still a member. */
export interface TakTrackSenderDto {
  userId: Uuid;
  displayName: string;
  eventGroupId: Uuid | null;
  eventGroupName: string | null;
}

/** The recorded movement of one CoT UID, such as a member's device or a marker. */
export interface TakTrackDto {
  uid: string;
  /** Newest CoT type in the range. */
  type: string;
  callsign: string | null;
  /** At least one position was the app's own beacon rather than a marker it placed. */
  selfReported: boolean;
  sender: TakTrackSenderDto;
  pointCount: number;
  /** Positions dropped because another position of the same UID carried the same time. */
  duplicatesDropped: number;
  /**
   * Continuous parts ordered by time. Lines are drawn only inside a segment; a gap, an implausible
   * jump or an approximate position starts a new one.
   */
  segments: TakTrackPointDto[][];
}

export interface TakTrafficHistoryGroupDto {
  id: Uuid;
  name: string;
}

/** Recorded positions of an event within a time range, grouped into tracks. */
export interface TakTrafficHistoryDto {
  /** @format date-time */
  from: string;
  /** @format date-time */
  to: string;
  gapSeconds: number;
  /** More positions were recorded than one answer holds; the newest ones are missing. */
  truncated: boolean;
  /** Most positions one answer contains. */
  maxPoints: number;
  tracks: TakTrackDto[];
  /** The event's groups, for filtering. */
  groups: TakTrafficHistoryGroupDto[];
}

export type TakTrafficExportFormat = "geojson" | "gpx";

export interface DeletedTakTrafficDto {
  deleted: number;
}
