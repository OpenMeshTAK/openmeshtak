import { fromJson, toBinary, type DescMessage, type JsonObject } from "@bufbuild/protobuf";

export type DeviceProfileValue = string | number | boolean;

/**
 * Sets one value at a dotted profile key, translating each segment to its protobuf JSON name.
 * The loader already proved that every key resolves in this schema.
 */
function assign(root: JsonObject, schema: DescMessage, key: string, value: DeviceProfileValue): void {
  let target = root;
  let message: DescMessage | undefined = schema;
  const parts = key.split(".");
  parts.forEach((part, index) => {
    const field = message?.fields.find((candidate) => candidate.localName === part);
    if (field === undefined) {
      throw new Error(`Profile key ${key} does not resolve in ${schema.typeName}.`);
    }
    if (index === parts.length - 1) {
      target[field.jsonName] = value;
      return;
    }
    const next = (target[field.jsonName] ??= {}) as JsonObject;
    target = next;
    message = field.fieldKind === "message" ? field.message : undefined;
  });
}

/**
 * Encodes a Meshtastic `DeviceProfile` (`.cfg`) from profile keys, using the protobuf schema of
 * the event's firmware profile. Values were validated against the profile beforehand; `fromJson`
 * still rejects anything the schema cannot represent instead of writing a broken file.
 */
export function encodeDeviceProfile(
  schema: DescMessage,
  values: ReadonlyMap<string, DeviceProfileValue>,
): Uint8Array {
  const json: JsonObject = {};
  for (const [key, value] of values) {
    assign(json, schema, key, value);
  }
  return toBinary(schema, fromJson(schema, json));
}
