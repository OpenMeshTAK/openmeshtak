import { createRequire } from "node:module";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { ScalarType, type DescField, type DescMessage } from "@bufbuild/protobuf";
import type { FirmwareField } from "./firmware-profile-schema.js";

/**
 * Binds a firmware profile to the official `@meshtastic/protobufs` package version it names.
 * Profiles reference the package by module name, so a later line can use a pinned npm alias of
 * another package version without code changes. Everything here works on the package's generic
 * `@bufbuild/protobuf` descriptors; no field of a specific firmware is named in code.
 */

export interface ProfileProtobufs {
  deviceProfile: DescMessage;
}

interface MeshtasticProtobufModule {
  ClientOnly?: { DeviceProfileSchema?: DescMessage };
}

const require = createRequire(import.meta.url);

/**
 * Reads the version of the installed module. JSR packages restrict `exports`, so the package.json
 * is found by walking up from the resolved entry point instead of being resolved directly.
 */
function installedVersion(module: string): string | null {
  let directory: string;
  try {
    directory = dirname(require.resolve(module));
  } catch {
    return null;
  }
  for (; directory !== dirname(directory); directory = dirname(directory)) {
    const candidate = join(directory, "package.json");
    if (existsSync(candidate)) {
      const packageJson = JSON.parse(readFileSync(candidate, "utf8")) as { version?: unknown };
      return typeof packageJson.version === "string" ? packageJson.version : null;
    }
  }
  return null;
}

/** Throws a readable error when the module is missing, has another version or no DeviceProfile. */
export async function loadProfileProtobufs(module: string, version: string): Promise<ProfileProtobufs> {
  const installed = installedVersion(module);
  if (installed !== version) {
    throw new Error(
      installed === null
        ? `protobuf module ${module} is not installed`
        : `protobuf module ${module} is ${installed}, but the profile requires ${version}`,
    );
  }
  const loaded = (await import(module)) as MeshtasticProtobufModule;
  const deviceProfile = loaded.ClientOnly?.DeviceProfileSchema;
  if (deviceProfile === undefined) {
    throw new Error(`protobuf module ${module} does not export ClientOnly.DeviceProfileSchema`);
  }
  return { deviceProfile };
}

/** Follows a dotted key such as `config.lora.hopLimit` through nested messages. */
export function resolveProtobufField(root: DescMessage, key: string): DescField | null {
  let message: DescMessage | undefined = root;
  let field: DescField | undefined;
  for (const part of key.split(".")) {
    field = message?.fields.find((candidate) => candidate.localName === part);
    if (field === undefined) {
      return null;
    }
    message = field.fieldKind === "message" ? field.message : undefined;
  }
  return field ?? null;
}

const SCALARS_BY_TYPE: Record<string, readonly ScalarType[]> = {
  string: [ScalarType.STRING],
  // 64-bit protobuf integers are bigint in JavaScript and deliberately unsupported.
  integer: [ScalarType.INT32, ScalarType.UINT32, ScalarType.SINT32, ScalarType.FIXED32, ScalarType.SFIXED32],
  number: [ScalarType.FLOAT, ScalarType.DOUBLE],
  boolean: [ScalarType.BOOL],
  bytes: [ScalarType.BYTES],
};

/** Returns why a profile field does not match the protobuf field, or null when it does. */
export function protobufMismatch(
  field: FirmwareField,
  descriptor: DescField,
  enumValues: readonly string[] | undefined,
): string | null {
  if (field.type === "enum") {
    if (descriptor.fieldKind !== "enum") {
      return "is not an enum in the protobuf schema";
    }
    const known = new Set(descriptor.enum.values.map(({ name }) => name));
    const unknown = (enumValues ?? []).filter((value) => !known.has(value));
    return unknown.length === 0 ? null : `uses enum values unknown to the protobuf schema: ${unknown.join(", ")}`;
  }
  if (descriptor.fieldKind !== "scalar") {
    return `is a ${descriptor.fieldKind} in the protobuf schema, not a ${field.type}`;
  }
  return SCALARS_BY_TYPE[field.type]?.includes(descriptor.scalar) === true
    ? null
    : `has protobuf scalar type ${ScalarType[descriptor.scalar]}, not ${field.type}`;
}
