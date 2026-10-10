import type { Uuid } from "../../shared/http/uuid.js";

export interface LiveTakConnectionDto {
  id: Uuid;
  userId: Uuid;
  userDisplayName: string;
  /** The app's callsign once it reported its position. */
  callsign: string | null;
  /** @format date-time */
  connectedAt: string;
  /** @format date-time */
  lastSeenAt: string;
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
}

/** Current TAK traffic of one event, held in memory only; nothing of it is stored. */
export interface LiveTakTrafficDto {
  connections: LiveTakConnectionDto[];
  items: LiveTakItemDto[];
}
