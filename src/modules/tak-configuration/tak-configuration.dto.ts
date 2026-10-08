import type { Uuid } from "../../shared/http/uuid.js";

/**
 * TAK settings of a Meshtastic event. Every event sends TAK clients to the built-in TAK server;
 * Meshtastic events (`meshtasticEnabled` on the event) also connect them to the Meshtastic app's
 * local TAK server, which carries CoT over this channel.
 */
export interface TakConfigurationDto {
  eventId: Uuid;
  /** Channel for the app's "TAK Mesh Channel"; `null` uses the primary channel. */
  meshChannelId: Uuid | null;
  /** Optimistic-concurrency version; 0 until first saved. */
  version: number;
  /** @format date-time */
  updatedAt: string | null;
}

export interface UpdateTakConfigurationRequest {
  /**
   * Version the client last read.
   * @isInt
   * @minimum 0
   */
  version: number;
  meshChannelId: Uuid | null;
}
