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
 * For a mesh position of a bound node it is the bound member, without a connection.
 */
export interface LiveTakSenderDto {
  /**
   * The sending connection; matches a `LiveTakConnectionDto.id` while that app is connected. Null
   * for mesh positions, which reach Core through an HQ uplink instead of a TAK connection.
   */
  connectionId: Uuid | null;
  userId: Uuid;
  userDisplayName: string;
  /** The sender's group in this event, or null when they are not a member, e.g. an administrator. */
  eventGroup: LiveTakAssignmentDto | null;
}

/** Where an item reached Core: from a connected TAK app or from a Meshtastic node through an HQ uplink. */
export type LiveTakItemSource = "tak" | "mesh";

/** The HQ that uploaded a mesh position, as it named itself. */
export interface LiveMeshHqDto {
  id: Uuid;
  name: string | null;
}

/** Meshtastic channel the packet arrived on; only index and name, never key material. */
export interface MeshChannelDto {
  /**
   * @isInt
   * @minimum 0
   * @maximum 7
   */
  index: number;
  /** @maxLength 12 */
  name?: string;
}

/** Provenance of an uplinked mesh position. */
export interface LiveMeshDetailsDto {
  /** Unsigned 32-bit Meshtastic node number. */
  nodeNum: number;
  /** The node number as Meshtastic shows it, e.g. `!a1b2c3d4`. */
  nodeId: string;
  /** Names the node announced; untrusted display text. */
  shortName: string | null;
  longName: string | null;
  /** The member the node is bound to; null shows the node as unknown. */
  memberId: Uuid | null;
  hq: LiveMeshHqDto;
  /**
   * When the HQ radio received the packet.
   * @format date-time
   */
  receivedAt: string;
  /** Battery level in percent; 101 means powered. */
  batteryLevel: number | null;
  snr: number | null;
  rssi: number | null;
  hopsAway: number | null;
  channel: MeshChannelDto | null;
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
  source: LiveTakItemSource;
  /**
   * The app or member that sent the item. Null only for mesh positions of nodes no member is bound
   * to; those carry a node-derived UID such as `meshtastic-a1b2c3d4` and the CoT type `a-u-G`.
   */
  placedBy: LiveTakSenderDto | null;
  /** Present on mesh positions only. */
  mesh?: LiveMeshDetailsDto;
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
