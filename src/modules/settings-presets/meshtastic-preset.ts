import type { ProblemFieldError } from "../../shared/errors/problem-error.js";
import { enumValues, isSecretField } from "../meshtastic-firmware/firmware-profile-loader.js";
import { lineOf, parseFirmwareVersion } from "../meshtastic-firmware/firmware-version.js";
import type { EventFirmware } from "../meshtastic-configuration/event-firmware.js";
import { editableFields, valueProblem, type FirmwareSettings } from "../meshtastic-configuration/firmware-settings.js";
import type { PresetSettingChangeDto, PresetSettingProblemDto } from "./settings-presets.dto.js";

type SettingValue = string | number | boolean;

export interface MeshtasticPresetPlan {
  /** The event's settings after the import. */
  settings: FirmwareSettings;
  changed: PresetSettingChangeDto[];
  unchanged: string[];
  invalid: PresetSettingProblemDto[];
  unsupported: string[];
  notInPreset: string[];
}

function enumLookup(firmware: EventFirmware): (name: string) => readonly string[] {
  return (name) => enumValues(firmware.profile, name) ?? [];
}

/**
 * Dry run of importing preset settings into an event. Every value is checked against the event's
 * own firmware profile, never the preset's: values it rejects and keys it cannot set are reported
 * and left out, so current values (and every secret) stay as they are.
 */
export function planMeshtasticPreset(
  firmware: EventFirmware,
  current: FirmwareSettings,
  preset: Readonly<Record<string, SettingValue>>,
): MeshtasticPresetPlan {
  const fields = new Map(editableFields(firmware).map((field) => [field.key, field]));
  const plan: MeshtasticPresetPlan = { settings: { ...current }, changed: [], unchanged: [], invalid: [], unsupported: [], notInPreset: [] };
  for (const [key, value] of Object.entries(preset)) {
    const field = fields.get(key);
    if (field === undefined) {
      plan.unsupported.push(key);
      continue;
    }
    const message = valueProblem(field, value, enumLookup(firmware));
    if (message !== null) {
      plan.invalid.push({ key, message });
    } else if (current[key] === value) {
      plan.unchanged.push(key);
    } else {
      plan.changed.push({ key, from: Object.hasOwn(current, key) ? (current[key] ?? null) : null, to: value });
      plan.settings[key] = value;
    }
  }
  plan.notInPreset = [...fields.keys()].filter((key) => !Object.hasOwn(preset, key));
  return plan;
}

export function sameFirmwareLine(left: string, right: string): boolean {
  const a = parseFirmwareVersion(left);
  const b = parseFirmwareVersion(right);
  return a !== null && b !== null && lineOf(a) === lineOf(b);
}

/**
 * Checks a library preset against the firmware it names. Secret and server-managed fields are
 * refused outright, so the library never stores a password or a member's node name.
 */
export function libraryMeshtasticProblems(firmware: EventFirmware, settings: Readonly<Record<string, SettingValue>>): ProblemFieldError[] {
  const all = new Map(firmware.profile.fields.map((field) => [field.key, field]));
  const editable = new Map(editableFields(firmware).map((field) => [field.key, field]));
  const problems: ProblemFieldError[] = [];
  for (const [key, value] of Object.entries(settings)) {
    const field = `document.meshtastic.settings.${key}`;
    const known = all.get(key);
    if (known !== undefined && isSecretField(known)) {
      problems.push({ field, code: "SECRET_NOT_ALLOWED", message: "Presets never hold passwords or PINs; set them on the event." });
      continue;
    }
    if (known?.definition.managedBy !== undefined) {
      problems.push({ field, code: "MANAGED_SETTING", message: "OpenMeshTak sets this value for each member." });
      continue;
    }
    const editableField = editable.get(key);
    if (editableField === undefined) {
      problems.push({ field, code: "UNKNOWN_SETTING", message: "This setting does not exist for the preset's firmware version." });
      continue;
    }
    const message = valueProblem(editableField, value, enumLookup(firmware));
    if (message !== null) {
      problems.push({ field, code: "INVALID_SETTING", message });
    }
  }
  return problems;
}
