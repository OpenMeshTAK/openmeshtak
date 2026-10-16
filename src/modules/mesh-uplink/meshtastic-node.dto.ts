import type { Uuid } from "../../shared/http/uuid.js";
import type { PageInfo } from "../../shared/pagination/cursor.js";

/** The event member a node is bound to or suggested for, with the names the radio was provisioned with. */
export interface MeshtasticNodeMemberDto {
  memberId: Uuid;
  userId: Uuid;
  displayName: string;
  callsign: string;
  /** The member's provisioned Meshtastic short name, e.g. `B1`; null while the group has no prefix. */
  shortName: string | null;
}

export interface MeshtasticNodeBindingDto {
  member: MeshtasticNodeMemberDto;
  /** @format date-time */
  boundAt: string;
}

/**
 * A Meshtastic node of the event: heard by an HQ uplink, or bound by an operator in advance. A bound
 * node's positions join the member's track under the member's CoT UID; unbound nodes appear as
 * unknown under `meshtastic-<node>`.
 */
export interface MeshtasticNodeDto {
  /** Unsigned 32-bit node number. */
  nodeNum: number;
  /** As Meshtastic shows it, e.g. `!a1b2c3d4`. */
  nodeId: string;
  /** Names the node announced; untrusted display text. */
  shortName: string | null;
  longName: string | null;
  /**
   * HQ receive time of the newest packet from the node; null when only bound in advance.
   * @format date-time
   */
  lastHeardAt: string | null;
  /** @format date-time */
  lastPositionAt: string | null;
  binding: MeshtasticNodeBindingDto | null;
  /**
   * For an unbound node whose short and long name equal exactly one unbound member's provisioned
   * short name and callsign (ignoring case and surrounding spaces): that member. An operator
   * confirms it by binding; Core never binds on its own.
   */
  suggestion: MeshtasticNodeMemberDto | null;
  /** Optimistic-concurrency version; send it back unchanged when binding. */
  version: number;
}

export interface MeshtasticNodePage {
  items: MeshtasticNodeDto[];
  page: PageInfo;
}

export interface BindMeshtasticNodeRequest {
  memberId: Uuid;
  /**
   * Version the client last read; 0 for a node Core has not stored yet (binding in advance).
   * @isInt
   * @minimum 0
   */
  version: number;
}
