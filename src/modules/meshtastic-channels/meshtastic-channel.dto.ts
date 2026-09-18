import type { Uuid } from "../../shared/http/uuid.js";
import type { PageInfo } from "../../shared/pagination/cursor.js";
import type { ChannelPskKind } from "./channel-psk.js";

/**
 * Meshtastic channel name; ASCII so the upstream 11-byte limit equals the character count.
 * @pattern ^[A-Za-z0-9_-]{1,11}$
 */
export type MeshtasticChannelName = string;

/**
 * Who receives a secondary channel: every member that matches any listed group, role or member.
 * The primary channel always reaches every member, so its audience is ignored.
 */
export interface ChannelAudience {
  /** @maxItems 100 */
  groupIds: Uuid[];
  /** @maxItems 100 */
  roleIds: Uuid[];
  /** @maxItems 500 */
  memberIds: Uuid[];
}

/** Describes the stored key without revealing it. */
export interface ChannelPskInfo {
  kind: ChannelPskKind;
  /** Increments on every rotation. */
  version: number;
  /** @format date-time */
  rotatedAt: string | null;
}

export interface MeshtasticChannelDto {
  id: Uuid;
  eventId: Uuid;
  name: string;
  /** Channel order; the lowest value (oldest on ties) is the primary channel. */
  sortOrder: number;
  primary: boolean;
  psk: ChannelPskInfo;
  uplinkEnabled: boolean;
  downlinkEnabled: boolean;
  /** Upstream position precision: 0 sends no position, 32 sends the full position. */
  positionPrecision: number;
  audience: ChannelAudience;
  /**
   * Secret channels withhold their key from every participant view and artifact except those of
   * key holders until the channel is released.
   */
  secret: boolean;
  /**
   * When a secret channel was released to its whole audience; `null` while withheld.
   * @format date-time
   */
  releasedAt: string | null;
  /**
   * Members of the audience who receive a secret channel ahead of the event to share it on site.
   * Selected like the audience; only members who are also in the audience count.
   */
  keyHolders: ChannelAudience;
  /** Optimistic-concurrency version; send it back unchanged with updates. */
  version: number;
  /** @format date-time */
  createdAt: string;
  /** @format date-time */
  updatedAt: string;
}

export interface MeshtasticChannelPage {
  items: MeshtasticChannelDto[];
  page: PageInfo;
}

/**
 * @isInt
 * @minimum 0
 * @maximum 32
 */
export type PositionPrecision = number;

/**
 * @isInt
 * @minimum 0
 * @maximum 1000
 */
export type ChannelSortOrder = number;

export interface CreateMeshtasticChannelRequest {
  name: MeshtasticChannelName;
  /** Defaults to after the last channel. */
  sortOrder?: ChannelSortOrder;
  /**
   * Optional base64 key: empty (no encryption), 1 byte (upstream default key), 16 or 32 bytes.
   * Omit it to let the server generate a random 32-byte key.
   * @maxLength 64
   */
  psk?: string;
  uplinkEnabled?: boolean;
  downlinkEnabled?: boolean;
  positionPrecision?: PositionPrecision;
  audience?: ChannelAudience;
  /** Secret channels need an AES key and cannot be the primary channel. */
  secret?: boolean;
  /** Only for secret channels. */
  keyHolders?: ChannelAudience;
}

export interface UpdateMeshtasticChannelRequest {
  /**
   * Version the client last read.
   * @isInt
   * @minimum 1
   */
  version: number;
  name: MeshtasticChannelName;
  sortOrder: ChannelSortOrder;
  uplinkEnabled: boolean;
  downlinkEnabled: boolean;
  positionPrecision: PositionPrecision;
  audience: ChannelAudience;
  /** Turning a channel secret again withholds it until it is released anew. */
  secret: boolean;
  keyHolders: ChannelAudience;
}

export interface ReleaseMeshtasticChannelRequest {
  /**
   * Version the client last read.
   * @isInt
   * @minimum 1
   */
  version: number;
}

export interface RotateChannelPskRequest {
  /**
   * Version the client last read.
   * @isInt
   * @minimum 1
   */
  version: number;
  /**
   * Optional replacement key in the same format as on creation; omit it for a random key.
   * @maxLength 64
   */
  psk?: string;
}

/** Plain key material; returned only by the audited reveal action. */
export interface RevealedChannelPsk {
  kind: ChannelPskKind;
  version: number;
  /** Base64 key exactly as Meshtastic clients expect it. */
  psk: string;
}
