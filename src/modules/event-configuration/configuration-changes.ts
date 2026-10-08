import type { ConfigurationChangeArea, ConfigurationChangeDto, ConfigurationChangeKind } from "./configuration-revision.dto.js";
import type { ConfigurationSnapshot } from "./configuration-snapshot.js";

type Json = unknown;

function isObject(value: Json): value is Record<string, Json> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function same(left: Json, right: Json): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

/** Paths of the leaves that differ; arrays such as audiences compare as one value. */
function changedPaths(left: Json, right: Json, prefix = ""): string[] {
  if (!isObject(left) || !isObject(right)) {
    return same(left, right) ? [] : [prefix];
  }
  const keys = [...new Set([...Object.keys(left), ...Object.keys(right)])].sort();
  return keys.flatMap((key) => changedPaths(left[key], right[key], prefix === "" ? key : `${prefix}.${key}`));
}

interface NamedItem {
  id: string;
  name: string;
}

function diffItems<T extends NamedItem>(area: ConfigurationChangeArea, published: T[], current: T[]): ConfigurationChangeDto[] {
  const before = new Map(published.map((item) => [item.id, item]));
  const after = new Map(current.map((item) => [item.id, item]));
  const changes: ConfigurationChangeDto[] = [];
  for (const item of current) {
    const old = before.get(item.id);
    if (old === undefined) {
      changes.push({ area, kind: "added", name: item.name, fields: [] });
      continue;
    }
    const paths = changedPaths(old, item).filter((path) => path !== "id");
    if (paths.length > 0) {
      changes.push({ area, kind: "changed", name: item.name, fields: paths });
    }
  }
  for (const item of published) {
    if (!after.has(item.id)) {
      changes.push({ area, kind: "removed", name: item.name, fields: [] });
    }
  }
  return changes;
}

function diffMeshtastic(published: ConfigurationSnapshot, current: ConfigurationSnapshot): ConfigurationChangeDto[] {
  const before = published.meshtastic;
  const after = current.meshtastic;
  if (before === null || after === null) {
    return same(before, after) ? [] : [{ area: "meshtastic", kind: "changed", name: "Firmware settings", fields: [] }];
  }
  const changes: ConfigurationChangeDto[] = [];
  const firmware = changedPaths(
    { firmwareVersion: before.firmwareVersion, effectiveMinimumVersion: before.effectiveMinimumVersion },
    { firmwareVersion: after.firmwareVersion, effectiveMinimumVersion: after.effectiveMinimumVersion },
  );
  if (firmware.length > 0) {
    changes.push({ area: "meshtastic", kind: "changed", name: "Firmware", fields: firmware });
  }
  if (before.profileId !== after.profileId || before.profileSha256 !== after.profileSha256) {
    changes.push({ area: "meshtastic", kind: "changed", name: "Firmware profile", fields: [] });
  }
  const keys = [...new Set([...Object.keys(before.settings), ...Object.keys(after.settings)])].sort();
  for (const key of keys) {
    const kind: ConfigurationChangeKind | null = !(key in before.settings)
      ? "added"
      : !(key in after.settings)
        ? "removed"
        : before.settings[key] === after.settings[key]
          ? null
          : "changed";
    if (kind !== null) {
      changes.push({ area: "meshtastic", kind, name: key, fields: [] });
    }
  }
  return changes;
}

/**
 * Lists what publishing would change for participants. Switching Meshtastic on or off is one
 * change that covers the channels, firmware settings and TAK mesh channel it adds or removes.
 */
export function diffConfigurationSnapshots(published: ConfigurationSnapshot, current: ConfigurationSnapshot): ConfigurationChangeDto[] {
  const changes = [...diffItems("roles", published.roles, current.roles), ...diffItems("groups", published.groups, current.groups)];
  if (published.meshtasticEnabled !== current.meshtasticEnabled) {
    const name = current.meshtasticEnabled ? "Meshtastic switched on" : "Meshtastic switched off";
    return [...changes, { area: "event", kind: "changed", name, fields: [] }];
  }
  changes.push(...diffItems("channels", published.channels, current.channels), ...diffMeshtastic(published, current));
  if (!same(published.tak, current.tak)) {
    changes.push({ area: "tak", kind: "changed", name: "TAK mesh channel", fields: [] });
  }
  return changes;
}
