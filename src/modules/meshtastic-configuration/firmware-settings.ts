import type { ProblemFieldError } from "../../shared/errors/problem-error.js";
import { enumValues, type LoadedFirmwareField } from "../meshtastic-firmware/firmware-profile-loader.js";
import { compareFirmwareVersions } from "../meshtastic-firmware/firmware-version.js";
import type { EventFirmware } from "./event-firmware.js";

/** Values of the editable profile fields, keyed by field key. */
export type FirmwareSettings = Record<string, string | number | boolean>;

/**
 * Fields an administrator may set for this event: editable fields that already exist in the
 * effective minimum version. Server-managed fields never appear in the settings document.
 */
export function editableFields(firmware: EventFirmware): LoadedFirmwareField[] {
  return firmware.profile.fields.filter(
    ({ definition, since }) =>
      definition.managedBy === undefined &&
      compareFirmwareVersions(since, firmware.effectiveMinimum) <= 0,
  );
}

function defaultOf({ definition }: LoadedFirmwareField): string | number | boolean {
  // The loader guarantees a default for every editable field.
  return ("default" in definition ? definition.default : undefined) as string | number | boolean;
}

export function defaultSettings(firmware: EventFirmware): FirmwareSettings {
  return Object.fromEntries(editableFields(firmware).map((field) => [field.key, defaultOf(field)]));
}

/** Why a value is not acceptable for a field, or null when it is. */
export function valueProblem(
  { definition }: LoadedFirmwareField,
  value: unknown,
  enumValues: (name: string) => readonly string[],
): string | null {
  switch (definition.type) {
    case "string":
      return typeof value === "string" && Buffer.byteLength(value, "utf8") <= definition.maxBytes
        ? null
        : `Use text of at most ${String(definition.maxBytes)} bytes.`;
    case "integer":
    case "number": {
      const integerOk = definition.type === "number" || Number.isInteger(value);
      return typeof value === "number" && integerOk && value >= definition.min && value <= definition.max
        ? null
        : `Use a ${definition.type === "integer" ? "whole number" : "number"} from ${String(definition.min)} to ${String(definition.max)}.`;
    }
    case "boolean":
      return typeof value === "boolean" ? null : "Use true or false.";
    case "enum":
      return typeof value === "string" && enumValues(definition.enum).includes(value)
        ? null
        : "Choose one of the listed values.";
    case "bytes":
      return "This value is managed by OpenMeshTak.";
  }
}

function enumLookup(firmware: EventFirmware): (name: string) => readonly string[] {
  return (name) => enumValues(firmware.profile, name) ?? [];
}

/**
 * Validates a settings document for the event's firmware. Unknown, managed and not-yet-available
 * keys are rejected; missing keys take the profile default. The server is the only authority.
 */
export function validateSettings(
  firmware: EventFirmware,
  input: Record<string, unknown>,
): { settings: FirmwareSettings; problems: ProblemFieldError[] } {
  const fields = editableFields(firmware);
  const byKey = new Map(fields.map((field) => [field.key, field]));
  const problems: ProblemFieldError[] = Object.keys(input)
    .filter((key) => !byKey.has(key))
    .map((key) => ({
      field: `settings.${key}`,
      code: "UNKNOWN_SETTING",
      message: "This setting does not exist or cannot be set for the event's firmware version.",
    }));

  const settings: FirmwareSettings = {};
  for (const field of fields) {
    const value = Object.hasOwn(input, field.key) ? input[field.key] : defaultOf(field);
    const message = valueProblem(field, value, enumLookup(firmware));
    if (message === null) {
      settings[field.key] = value as string | number | boolean;
    } else {
      problems.push({ field: `settings.${field.key}`, code: "INVALID_SETTING", message });
    }
  }
  return { settings, problems };
}

export interface FirmwareChangeReport {
  /** Values valid in both versions. */
  kept: string[];
  /** Values of fields the new version does not have. */
  dropped: string[];
  /** Values the new version rejects; they fall back to its default. */
  invalid: string[];
  /** New fields, initialised with the profile default. */
  added: string[];
}

/** Dry run of a firmware change; also returns the settings the change would store. */
export function planFirmwareChange(
  current: FirmwareSettings,
  next: EventFirmware,
): { report: FirmwareChangeReport; settings: FirmwareSettings } {
  const report: FirmwareChangeReport = { kept: [], dropped: [], invalid: [], added: [] };
  const settings: FirmwareSettings = {};
  const nextFields = editableFields(next);
  const nextKeys = new Set(nextFields.map(({ key }) => key));

  for (const field of nextFields) {
    if (!Object.hasOwn(current, field.key)) {
      report.added.push(field.key);
      settings[field.key] = defaultOf(field);
    } else if (valueProblem(field, current[field.key], enumLookup(next)) === null) {
      report.kept.push(field.key);
      settings[field.key] = current[field.key] as string | number | boolean;
    } else {
      report.invalid.push(field.key);
      settings[field.key] = defaultOf(field);
    }
  }
  report.dropped = Object.keys(current).filter((key) => !nextKeys.has(key));
  return { report, settings };
}
