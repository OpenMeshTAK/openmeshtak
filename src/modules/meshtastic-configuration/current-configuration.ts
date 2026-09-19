import type { Prisma } from "../../generated/prisma/client.js";
import type { ProblemFieldError } from "../../shared/errors/problem-error.js";
import { defaultFirmwareProfile, firmwareProfiles } from "../meshtastic-firmware/firmware-profiles.js";
import { resolveEventFirmware, type EventFirmware } from "./event-firmware.js";
import { defaultSettings, validateSettings, type FirmwareSettings } from "./firmware-settings.js";

type ConfigurationClient = Pick<Prisma.TransactionClient, "meshtasticConfiguration">;

/**
 * The event's stored or default Meshtastic configuration, checked against the profiles of this
 * Core release. A stored value can become invalid after an upgrade removes a firmware line or
 * changes a field; `problems` then explains why the event cannot activate or publish.
 */
export interface CurrentMeshtasticConfiguration {
  firmwareVersion: string;
  /** `null` when the stored firmware version no longer resolves to a shipped profile. */
  firmware: EventFirmware | null;
  /** As stored; for events without a stored configuration, the profile defaults. */
  settings: FirmwareSettings;
  problems: ProblemFieldError[];
  /** 0 until the configuration is first saved. */
  version: number;
  updatedAt: Date | null;
}

export async function loadMeshtasticConfiguration(
  client: ConfigurationClient,
  eventId: string,
): Promise<CurrentMeshtasticConfiguration> {
  const row = await client.meshtasticConfiguration.findUnique({ where: { eventId } });
  const profiles = await firmwareProfiles();
  const firmwareVersion = row?.firmwareVersion ?? (await defaultFirmwareProfile()).file.firmware.line;
  const resolved = resolveEventFirmware(profiles, firmwareVersion);
  const base = { firmwareVersion, version: row?.version ?? 0, updatedAt: row?.updatedAt ?? null };

  if (!resolved.ok) {
    return {
      ...base,
      firmware: null,
      settings: (row?.settings ?? {}) as FirmwareSettings,
      problems: [{ ...resolved.problem, field: "meshtastic.firmwareVersion" }],
    };
  }
  if (row === null) {
    return { ...base, firmware: resolved.firmware, settings: defaultSettings(resolved.firmware), problems: [] };
  }

  const stored = row.settings as Record<string, unknown>;
  const { problems } = validateSettings(resolved.firmware, stored);
  return {
    ...base,
    firmware: resolved.firmware,
    settings: stored as FirmwareSettings,
    problems: problems.map((problem) => ({ ...problem, field: `meshtastic.${problem.field}` })),
  };
}
