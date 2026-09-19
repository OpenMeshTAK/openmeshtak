import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { DescField, DescMessage } from "@bufbuild/protobuf";
import {
  firmwareProfileSchema,
  type FirmwareField,
  type FirmwareProfileFile,
} from "./firmware-profile-schema.js";
import {
  compareFirmwareVersions,
  lineOf,
  parseFirmwareVersion,
  type FirmwareVersion,
} from "./firmware-version.js";
import { isManagedFieldKey } from "./managed-fields.js";
import { loadProfileProtobufs, protobufMismatch, resolveProtobufField } from "./profile-protobufs.js";

export interface LoadedFirmwareField {
  key: string;
  definition: FirmwareField;
  /** Effective first version of the field: its `since`, otherwise the profile minimum. */
  since: FirmwareVersion;
  descriptor: DescField;
}

export interface LoadedFirmwareProfile {
  file: FirmwareProfileFile;
  /** SHA-256 of `profile.json`, recorded in configuration revisions for provenance. */
  sha256: string;
  min: FirmwareVersion;
  deviceProfile: DescMessage;
  fields: LoadedFirmwareField[];
}

export class FirmwareProfileError extends Error {
  constructor(problems: string[]) {
    super(`Invalid Meshtastic firmware profiles:\n- ${problems.join("\n- ")}`);
    this.name = "FirmwareProfileError";
  }
}

interface ProfileSource {
  path: string;
  bytes: Buffer;
}

function findProfileFiles(directories: readonly string[]): ProfileSource[] {
  return directories.flatMap((directory) =>
    existsSync(directory)
      ? readdirSync(directory, { withFileTypes: true })
          .filter((entry) => entry.isDirectory())
          .map((entry) => join(directory, entry.name, "profile.json"))
          .filter((path) => existsSync(path))
          .map((path) => ({ path, bytes: readFileSync(path) }))
      : [],
  );
}

/** Version rules the zod schema cannot express. Returns the parsed minimum when they hold. */
function versionProblems(file: FirmwareProfileFile, problems: string[]): FirmwareVersion | null {
  const line = parseFirmwareVersion(file.firmware.line);
  const min = parseFirmwareVersion(file.firmware.min);
  if (line === null || min === null || lineOf(min) !== file.firmware.line) {
    problems.push(`${file.id}: firmware.min ${file.firmware.min} is not in line ${file.firmware.line}`);
    return null;
  }
  for (const tested of file.firmware.tested) {
    const version = parseFirmwareVersion(tested);
    if (version === null || lineOf(version) !== file.firmware.line || compareFirmwareVersions(version, min) < 0) {
      problems.push(`${file.id}: tested version ${tested} is outside ${file.firmware.line} or below the minimum`);
    }
  }
  return min;
}

function fieldProblems(
  file: FirmwareProfileFile,
  key: string,
  field: FirmwareField,
  min: FirmwareVersion,
): string[] {
  const problems: string[] = [];
  const where = `${file.id}: field ${key}`;
  if (!file.sections.some(({ id }) => id === field.section)) {
    problems.push(`${where} uses unknown section ${field.section}`);
  }
  if (field.since !== undefined) {
    const since = parseFirmwareVersion(field.since);
    if (since === null || lineOf(since) !== file.firmware.line || compareFirmwareVersions(since, min) < 0) {
      problems.push(`${where} has since ${field.since} outside ${file.firmware.line} or below the minimum`);
    }
  }
  if (field.managedBy !== undefined && !isManagedFieldKey(key)) {
    problems.push(`${where} is managed, but OpenMeshTak cannot resolve a value for it`);
  }
  if (field.managedBy === undefined && (!("default" in field) || field.default === undefined)) {
    problems.push(`${where} is editable and needs a default`);
  }
  if ((field.type === "integer" || field.type === "number") && field.min > field.max) {
    problems.push(`${where} has min above max`);
  }
  if (field.type === "enum") {
    const values = file.enums[field.enum];
    if (values === undefined) {
      problems.push(`${where} references missing enum ${field.enum}`);
    } else if (field.default !== undefined && !values.includes(field.default)) {
      problems.push(`${where} has a default outside enum ${field.enum}`);
    }
  }
  return problems;
}

async function loadProfile(source: ProfileSource, problems: string[]): Promise<LoadedFirmwareProfile | null> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(source.bytes.toString("utf8"));
  } catch {
    problems.push(`${source.path}: not valid JSON`);
    return null;
  }
  const result = firmwareProfileSchema.safeParse(parsed);
  if (!result.success) {
    problems.push(...result.error.issues.map((issue) => `${source.path}: ${issue.path.join(".")} ${issue.message}`));
    return null;
  }

  const file = result.data;
  const before = problems.length;
  const min = versionProblems(file, problems);
  if (min === null) {
    return null;
  }

  let deviceProfile: DescMessage;
  try {
    deviceProfile = (await loadProfileProtobufs(file.protobufs.module, file.protobufs.version)).deviceProfile;
  } catch (error: unknown) {
    problems.push(`${file.id}: ${error instanceof Error ? error.message : "protobuf module failed to load"}`);
    return null;
  }

  const fields: LoadedFirmwareField[] = [];
  for (const [key, definition] of Object.entries(file.fields)) {
    problems.push(...fieldProblems(file, key, definition, min));
    const descriptor = resolveProtobufField(deviceProfile, key);
    if (descriptor === null) {
      problems.push(`${file.id}: field ${key} does not exist in DeviceProfile`);
      continue;
    }
    const mismatch = protobufMismatch(
      definition,
      descriptor,
      definition.type === "enum" ? file.enums[definition.enum] : undefined,
    );
    if (mismatch !== null) {
      problems.push(`${file.id}: field ${key} ${mismatch}`);
      continue;
    }
    const since = definition.since === undefined ? min : (parseFirmwareVersion(definition.since) ?? min);
    fields.push({ key, definition, since, descriptor });
  }

  if (problems.length > before) {
    return null;
  }
  return {
    file,
    sha256: createHash("sha256").update(source.bytes).digest("hex"),
    min,
    deviceProfile,
    fields,
  };
}

function registryProblems(profiles: LoadedFirmwareProfile[]): string[] {
  const problems: string[] = [];
  const seen = new Map<string, string>();
  for (const { file } of profiles) {
    for (const value of [file.id, `line ${file.firmware.line}`]) {
      const owner = seen.get(value);
      if (owner !== undefined) {
        problems.push(`${file.id} and ${owner} both use ${value}`);
      }
      seen.set(value, file.id);
    }
  }
  if (profiles.length > 0 && profiles.filter(({ file }) => file.default).length !== 1) {
    problems.push("exactly one firmware profile must be marked as default");
  }
  return problems;
}

/**
 * Loads every `<directory>/<profile>/profile.json`. Any invalid profile fails the whole load so
 * Core refuses to start instead of offering half-checked compatibility claims.
 */
export async function loadFirmwareProfiles(directories: readonly string[]): Promise<LoadedFirmwareProfile[]> {
  const problems: string[] = [];
  const loaded: LoadedFirmwareProfile[] = [];
  for (const source of findProfileFiles(directories)) {
    const profile = await loadProfile(source, problems);
    if (profile !== null) {
      loaded.push(profile);
    }
  }
  problems.push(...registryProblems(loaded));
  if (loaded.length === 0 && problems.length === 0) {
    problems.push(`no firmware profile found in ${directories.join(", ")}`);
  }
  if (problems.length > 0) {
    throw new FirmwareProfileError(problems);
  }
  return loaded.sort((left, right) => compareFirmwareVersions(right.min, left.min));
}
