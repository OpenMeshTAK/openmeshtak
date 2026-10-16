import type { Uuid } from "../../shared/http/uuid.js";
import type { MeshChannelDto } from "../tak-server/live-traffic.dto.js";

/** `position` for a decoded `POSITION_APP` packet, `nodeinfo` for a decoded `NODEINFO_APP` packet. */
export type MeshObservationKind = "position" | "nodeinfo";

/** A decoded Meshtastic position, normalized by the HQ. */
export interface MeshPositionDto {
  /**
   * Degrees, WGS 84.
   * @minimum -90
   * @maximum 90
   */
  lat: number;
  /**
   * Degrees, WGS 84.
   * @minimum -180
   * @maximum 180
   */
  lon: number;
  /**
   * Meshtastic `precision_bits`; fewer bits mean a deliberately coarser position. 32, 0 or absent
   * mean full precision.
   * @isInt
   * @minimum 0
   * @maximum 32
   */
  precisionBits?: number;
  /**
   * Ground speed in metres per second.
   * @minimum 0
   * @maximum 1000
   */
  groundSpeed?: number;
  /**
   * Direction of travel in degrees clockwise from true north.
   * @minimum 0
   * @maximum 360
   */
  groundTrack?: number;
}

/**
 * One packet the HQ radio received, decoded and normalized. Node database entries from the radio
 * are not observations: only packets heard live, with their packet ID, may be sent.
 */
export interface MeshObservationDto {
  kind: MeshObservationKind;
  /**
   * The sending node's number (`from`).
   * @isInt
   * @minimum 1
   * @maximum 4294967294
   */
  nodeNum: number;
  /**
   * The Meshtastic packet ID; with `nodeNum` it identifies the packet across retries and HQs.
   * @isInt
   * @minimum 1
   * @maximum 4294967295
   */
  packetId: number;
  /**
   * When the HQ radio received the packet, RFC 3339 with offset. Authoritative for ordering.
   * @maxLength 40
   */
  receivedAt: string;
  /**
   * The position time the node reported, if any; used only when plausible.
   * @maxLength 40
   */
  packetTime?: string;
  /** Required for `position`, ignored for `nodeinfo`. */
  position?: MeshPositionDto;
  /** @maxLength 8 */
  shortName?: string;
  /** @maxLength 40 */
  longName?: string;
  /**
   * Percent; 101 means powered.
   * @isInt
   * @minimum 0
   * @maximum 101
   */
  batteryLevel?: number;
  /**
   * @minimum -50
   * @maximum 50
   */
  snr?: number;
  /**
   * @isInt
   * @minimum -200
   * @maximum 0
   */
  rssi?: number;
  /**
   * @isInt
   * @minimum 0
   * @maximum 7
   */
  hopsAway?: number;
  /** Channel index and name only; never key material. */
  channel?: MeshChannelDto;
}

export interface MeshObservationBatchRequest {
  /** A random UUID the HQ keeps for itself, so viewers can tell HQs apart. */
  hqId: Uuid;
  /**
   * Display name of the HQ, e.g. `HQ North`.
   * @maxLength 60
   */
  hqName?: string;
  /**
   * Observations in the order the HQ received them.
   * @minItems 1
   * @maxItems 200
   */
  observations: MeshObservationDto[];
}

/**
 * What Core did with one observation. Every status is final: the HQ removes the observation from
 * its outbox whatever the status, and a retry of the same packet answers `duplicate`.
 * - `accepted`: shown in the live view and, when the event records, recorded.
 * - `duplicate`: this packet was already received, from this or another HQ.
 * - `tak-preferred`: the bound member's TAK app sent a position within the event's position interval.
 * - `rejected`: unusable; `code` says why.
 */
export type MeshObservationStatus = "accepted" | "duplicate" | "tak-preferred" | "rejected";

export interface MeshObservationResultDto {
  status: MeshObservationStatus;
  /**
   * Present for `rejected`: `INVALID_TIME`, `RECEIVED_IN_FUTURE`, `TOO_OLD` (older than the
   * seven-day deduplication window), `NO_POSITION` or `NO_FIX` (0,0).
   */
  code?: string;
}

export interface MeshObservationBatchResultDto {
  accepted: number;
  duplicates: number;
  takPreferred: number;
  rejected: number;
  /** Positions written to the event's recording; 0 while the event does not record. */
  recorded: number;
  /** One result per observation, in request order. */
  results: MeshObservationResultDto[];
}
