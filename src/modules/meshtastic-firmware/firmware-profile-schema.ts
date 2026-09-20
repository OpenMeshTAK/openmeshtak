import { z } from "zod";

/**
 * Shape of `firmware-profiles/<id>/profile.json`. See MESHTASTIC.md in the planning repository.
 * Rules that span several fields, versions or the protobuf package are checked by the loader.
 */

const fullVersion = z.string().regex(/^\d+\.\d+\.\d+$/, "Use major.minor.patch.");

const commonField = {
  section: z.string().min(1),
  label: z.string().min(1),
  description: z.string().min(1).optional(),
  unit: z.string().min(1).optional(),
  /** First patch of the line that has the field; omitted when it exists from `firmware.min`. */
  since: fullVersion.optional(),
};

/** `managedBy` marks values Core resolves per member; profile data can never make them editable. */
const managedBy = z.literal("openmeshtak").optional();

const stringField = z.strictObject({
  ...commonField,
  type: z.literal("string"),
  maxBytes: z.number().int().positive(),
  default: z.string().optional(),
  managedBy,
});

const integerField = z.strictObject({
  ...commonField,
  type: z.literal("integer"),
  min: z.number().int(),
  max: z.number().int(),
  default: z.number().int().optional(),
  managedBy,
});

const numberField = z.strictObject({
  ...commonField,
  type: z.literal("number"),
  min: z.number(),
  max: z.number(),
  default: z.number().optional(),
  managedBy,
});

const booleanField = z.strictObject({
  ...commonField,
  type: z.literal("boolean"),
  default: z.boolean().optional(),
  managedBy,
});

const enumField = z.strictObject({
  ...commonField,
  type: z.literal("enum"),
  enum: z.string().min(1),
  default: z.string().optional(),
  managedBy,
});

/** Raw key material is only ever produced by Core. */
const bytesField = z.strictObject({
  ...commonField,
  type: z.literal("bytes"),
  managedBy: z.literal("openmeshtak"),
});

export const firmwareFieldSchema = z.discriminatedUnion("type", [
  stringField,
  integerField,
  numberField,
  booleanField,
  enumField,
  bytesField,
]);

export const firmwareProfileSchema = z.strictObject({
  id: z.string().regex(/^[a-z0-9][a-z0-9.-]{0,63}$/),
  formatVersion: z.literal(1),
  firmware: z.strictObject({
    line: z.string().regex(/^\d+\.\d+$/, "Use major.minor."),
    min: fullVersion,
    tested: z.array(fullVersion),
    testedBuilds: z.array(z.string().min(1)).optional(),
    channel: z.enum(["stable", "beta", "alpha"]),
  }),
  protobufs: z.strictObject({
    module: z.string().min(1),
    version: fullVersion,
  }),
  flasherUrl: z.url(),
  flashingNotes: z.string().min(1).optional(),
  default: z.boolean(),
  sections: z.array(z.strictObject({ id: z.string().min(1), label: z.string().min(1) })).min(1),
  fields: z.record(z.string().regex(/^[A-Za-z0-9]+(?:\.[A-Za-z0-9]+)*$/), firmwareFieldSchema),
  /** Allowed values per enum, either plain upstream names or with an English UI label. */
  enums: z.record(
    z.string().min(1),
    z
      .array(z.union([z.string().min(1), z.strictObject({ value: z.string().min(1), label: z.string().min(1) })]))
      .min(1),
  ),
});

export type FirmwareProfileFile = z.infer<typeof firmwareProfileSchema>;
export type FirmwareField = z.infer<typeof firmwareFieldSchema>;

