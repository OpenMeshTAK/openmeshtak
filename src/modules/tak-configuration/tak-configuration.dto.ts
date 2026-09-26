import type { Uuid } from "../../shared/http/uuid.js";

/**
 * - `none`: OpenMeshTak gives no TAK connection guidance.
 * - `meshtastic-local-server`: each participant enables the Meshtastic app's local TAK server and
 *   connects ATAK/iTAK on the same phone to it. The app creates its own certificates, so
 *   OpenMeshTak provides guidance and settings, not a ready-made connection package.
 * - `built-in-server`: participants enroll ATAK/iTAK with the built-in OpenMeshTak TAK server.
 */
export type TakConnectionMode = "none" | "meshtastic-local-server" | "built-in-server";

export interface TakConfigurationDto {
  eventId: Uuid;
  mode: TakConnectionMode;
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
  mode: TakConnectionMode;
  meshChannelId: Uuid | null;
}
