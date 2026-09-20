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
  /**
   * Every editable field of the firmware: the stored value, or the profile default for fields
   * added to the profile after the configuration was saved. Stored values for fields the profile
   * no longer has are left out here and reported in `problems`.
   */
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
  const settings = defaultSettings(resolved.firmware);
  for (const key of Object.keys(settings)) {
    if (Object.hasOwn(stored, key)) {
      settings[key] = stored[key] as FirmwareSettings[string];
    }
  }
  return {
    ...base,
    firmware: resolved.firmware,
    settings,
    problems: problems.map((problem) => ({ ...problem, field: `meshtastic.${problem.field}` })),
  };
}
