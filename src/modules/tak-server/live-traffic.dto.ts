import type { Uuid } from "../../shared/http/uuid.js";

/** An event group or role, as far as the live view needs it for grouping and filtering. */
export interface LiveTakAssignmentDto {
  id: Uuid;
  name: string;
}

export interface LiveTakConnectionDto {
  id: Uuid;
  userId: Uuid;
  userDisplayName: string;
  /** The user's group in this event, or null when they are not a member, e.g. an administrator. */
  eventGroup: LiveTakAssignmentDto | null;
  /** The user's role in this event, or null when they are not a member. */
  eventRole: LiveTakAssignmentDto | null;
  /** The app's callsign once it reported its position. */
  callsign: string | null;
  /** @format date-time */
  connectedAt: string;
  /** @format date-time */
  lastSeenAt: string;
}

/**
 * The TAK app that sent an item: for a position the app itself, for a marker the app that placed
 * it. The connection may have ended since; Core keeps current items after their app disconnects.
 */
export interface LiveTakSenderDto {
  /** The sending connection; matches a `LiveTakConnectionDto.id` while that app is connected. */
  connectionId: Uuid;
  userId: Uuid;
  userDisplayName: string;
  /** The sender's group in this event, or null when they are not a member, e.g. an administrator. */
  eventGroup: LiveTakAssignmentDto | null;
}

/** The newest state of one CoT item, such as a member's position or a marker they placed. */
export interface LiveTakItemDto {
  uid: string;
  /** CoT type, e.g. `a-f-G-U-C` for a friendly ground unit. */
  type: string;
  callsign: string | null;
  lat: number;
  lon: number;
  /** Direction of travel in degrees clockwise from true north (CoT `track/course`), or null when not sent. */
  course: number | null;
  /** Ground speed in metres per second (CoT `track/speed`), or null when not sent. */
  speed: number | null;
  /** @format date-time */
  time: string;
  /** @format date-time */
  stale: string;
  placedBy: LiveTakSenderDto;
}

/**
 * Realtime update after the first snapshot: connections and items that are new or changed, in
 * full, and the ids of those that are gone. Sent as `traffic-changes` on `/tak-traffic`.
 */
export interface LiveTakTrafficChangesDto {
  connections: { upserted: LiveTakConnectionDto[]; removed: string[] };
  items: { upserted: LiveTakItemDto[]; removed: string[] };
}

/** Current TAK traffic of one event, held in memory only; nothing of it is stored. */
export interface LiveTakTrafficDto {
  connections: LiveTakConnectionDto[];
  items: LiveTakItemDto[];
}
