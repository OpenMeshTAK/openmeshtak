import type { Uuid } from "../../shared/http/uuid.js";

/**
 * A secret-bearing Meshtastic channel handout. It is returned only to the signed-in key holder,
 * must not be persisted by clients and becomes obsolete as soon as the channel key rotates.
 */
export interface ChannelHandoutDto {
  channelId: Uuid;
  channelName: string;
  primary: boolean;
  pskVersion: number;
  /** Canonical Meshtastic ChannelSet URL; the fragment contains the channel key. */
  url: string;
}
