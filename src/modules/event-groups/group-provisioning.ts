import type { EventGroup } from "../../generated/prisma/client.js";
import type { ProblemFieldError } from "../../shared/errors/problem-error.js";
import {
  CALLSIGN_PLACEHOLDERS,
  type MeshtasticDeviceRole,
  type TakRole,
  type TakTeam,
} from "./provisioning-values.js";

/**
 * Identifier used for TAK server groups, Meshtastic channel names and mission groups.
 * @pattern ^[A-Za-z0-9_-]+$
 * @minLength 1
 * @maxLength 64
 */
export type ProvisioningName = string;

/**
 * Meshtastic channel name; ASCII so the upstream 11-byte limit equals the character count.
 * @pattern ^[A-Za-z0-9_-]{1,11}$
 */
export type MeshtasticChannelName = string;

export interface GroupProvisioning {
  /**
   * Callsign template. Allowed placeholders: `{username}` (required) and `{group}`.
   * Example: `{username} [Bravo]`.
   * @minLength 1
   * @maxLength 64
   */
  callsignFormat: string;
  /**
   * Meshtastic short-name prefix, e.g. `B` for `B1`, `B2`. Unique within the event.
   * `null` until chosen; activation requires it.
   * @pattern ^[A-Z0-9]{1,3}$
   */
  shortNamePrefix: string | null;
  tak: {
    team: TakTeam;
    role: TakRole;
    /** @maxItems 20 */
    serverGroups: ProvisioningName[];
  };
  meshtastic: {
    deviceRole: MeshtasticDeviceRole;
    /** @maxItems 8 */
    channels: MeshtasticChannelName[];
  };
  /** @maxItems 20 */
  missionGroups: ProvisioningName[];
}

export interface GroupProvisioningColumns {
  callsignFormat: string;
  shortNamePrefix: string | null;
  takTeam: string;
  takRole: string;
  takServerGroups: string[];
  meshtasticDeviceRole: string;
  meshtasticChannels: string[];
  missionGroups: string[];
}

export function defaultShortNamePrefix(slug: string): string {
  return slug.charAt(0).toUpperCase();
}

export function defaultProvisioning(slug: string): GroupProvisioning {
  return {
    callsignFormat: "{username}",
    shortNamePrefix: defaultShortNamePrefix(slug),
    tak: { team: "Cyan", role: "Team Member", serverGroups: [] },
    meshtastic: { deviceRole: "CLIENT", channels: [] },
    missionGroups: [],
  };
}

function duplicates(values: string[]): boolean {
  return new Set(values).size !== values.length;
}

/**
 * Checks the rules the generated schema cannot express. Value sets, patterns and lengths are
 * already enforced by request validation.
 */
export function provisioningProblems(provisioning: GroupProvisioning): ProblemFieldError[] {
  const problems: ProblemFieldError[] = [];
  const placeholders: string[] = provisioning.callsignFormat.match(/\{[^}]*\}/g) ?? [];

  if (placeholders.some((token) => !(CALLSIGN_PLACEHOLDERS as readonly string[]).includes(token))) {
    problems.push({
      field: "provisioning.callsignFormat",
      code: "UNKNOWN_PLACEHOLDER",
      message: "Only {username} and {group} are supported.",
    });
  }
  if (!placeholders.includes("{username}")) {
    problems.push({
      field: "provisioning.callsignFormat",
      code: "USERNAME_REQUIRED",
      message: "The format must contain {username} so callsigns stay unique.",
    });
  }

  for (const [field, values] of [
    ["provisioning.tak.serverGroups", provisioning.tak.serverGroups],
    ["provisioning.meshtastic.channels", provisioning.meshtastic.channels],
    ["provisioning.missionGroups", provisioning.missionGroups],
  ] as const) {
    if (duplicates(values)) {
      problems.push({ field, code: "DUPLICATE", message: "Each entry may appear only once." });
    }
  }

  return problems;
}

export function toProvisioningColumns(provisioning: GroupProvisioning): GroupProvisioningColumns {
  return {
    callsignFormat: provisioning.callsignFormat,
    shortNamePrefix: provisioning.shortNamePrefix,
    takTeam: provisioning.tak.team,
    takRole: provisioning.tak.role,
    takServerGroups: provisioning.tak.serverGroups,
    meshtasticDeviceRole: provisioning.meshtastic.deviceRole,
    meshtasticChannels: provisioning.meshtastic.channels,
    missionGroups: provisioning.missionGroups,
  };
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

/** Stored values were validated on write; the casts restore their narrow API types. */
export function toGroupProvisioning(row: EventGroup): GroupProvisioning {
  return {
    callsignFormat: row.callsignFormat,
    shortNamePrefix: row.shortNamePrefix,
    tak: {
      team: row.takTeam as TakTeam,
      role: row.takRole as TakRole,
      serverGroups: stringArray(row.takServerGroups),
    },
    meshtastic: {
      deviceRole: row.meshtasticDeviceRole as MeshtasticDeviceRole,
      channels: stringArray(row.meshtasticChannels),
    },
    missionGroups: stringArray(row.missionGroups),
  };
}
