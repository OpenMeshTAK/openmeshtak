import type { Uuid } from "../../shared/http/uuid.js";

export type TakGroupMode = "off" | "simple" | "advanced";

/**
 * TAK settings of an event. Every event sends TAK clients to the built-in TAK server; Meshtastic
 * events (`meshtasticEnabled` on the event) also connect them to the Meshtastic app's local TAK
 * server, which carries CoT over the mesh channel. ATAK preferences have their own list
 * (`/events/{eventId}/tak/atak-preferences`).
 */
export interface TakConfigurationDto {
  eventId: Uuid;
  /** Channel for the app's "TAK Mesh Channel"; `null` uses the primary channel. */
  meshChannelId: Uuid | null;
  /**
   * `off`: every member sees the whole event. `simple`: members see only their event group.
   * `advanced`: members receive what is sent into the event's TAK groups they receive from
   * (`/events/{eventId}/tak/groups`). In both separating modes roles with `seesAllTakGroups` see
   * and reach everyone. Applies to live connections within seconds, without publishing.
   */
  groupMode: TakGroupMode;
  /** In the advanced mode, TAK apps list their groups and may switch them on and off. */
  groupsInApp: boolean;
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
  /** Omit to keep the current mode. */
  groupMode?: TakGroupMode;
  /** Omit to keep the current value. */
  groupsInApp?: boolean;
}
