import type { TakServerSettings } from "../../generated/prisma/client.js";
import { database } from "../../shared/database/database.js";

export const SETTINGS_ID = "tak-server";
const DEFAULTS = {
  enabled: false,
  hostName: null,
  enrollmentPort: 8446,
  martiPort: 8443,
  streamingPort: 8089,
  clientCertificateDays: 365,
  endpointChangedAt: null,
};
/** DNS name with at least one dot, or an IPv4 address; devices must be able to reach it. */
export const HOST_NAME =
  /^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$|^(?:(?:25[0-5]|2[0-4]\d|1?\d?\d)\.){3}(?:25[0-5]|2[0-4]\d|1?\d?\d)$/;

export async function loadTakServerSettings(): Promise<TakServerSettings> {
  const row = await database.takServerSettings.findUnique({ where: { id: SETTINGS_ID } });
  return row ?? { id: SETTINGS_ID, ...DEFAULTS, version: 0, updatedAt: new Date(0) };
}

