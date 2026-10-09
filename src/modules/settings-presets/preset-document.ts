import { z } from "zod";
import { validationProblem, type ProblemFieldError } from "../../shared/errors/problem-error.js";
import type { PresetDocumentDto } from "./settings-presets.dto.js";

export const PRESET_FORMAT = "openmeshtak-preset";
export const PRESET_FORMAT_VERSION = 1;
/** Serialized size limit; well below the JSON body limit and far above any real preset. */
export const MAX_PRESET_BYTES = 512 * 1024;
const MAX_SETTINGS = 1000;
const MAX_ATAK_ENTRIES = 2000;

export const PRESET_ABOUT =
  "OpenMeshTak settings preset. Portable JSON, not an ATAK .pref, a Meshtastic .cfg or a firmware " +
  "profile. Meshtastic settings use the field keys of OpenMeshTak's firmware profile; ATAK " +
  "preferences use ATAK's preference keys and Java types, targeting the whole event or a group or " +
  "role by slug. Never add channel keys, passwords, PINs, certificates, tokens or personal data. " +
  "Edit values and keys freely; OpenMeshTak validates everything and shows a preview on import.";

/** Keys that would reach an object's prototype when copied naively. */
const UNSAFE_KEYS = new Set(["__proto__", "constructor", "prototype"]);
const safeKey = z
  .string()
  .min(1)
  .max(200)
  .refine((key) => !UNSAFE_KEYS.has(key), "This key is not allowed.");

const meshtasticContent = z.strictObject({
  firmwareVersion: z.string().min(1).max(20),
  settings: z
    .record(safeKey, z.union([z.string().max(10_000), z.number().finite(), z.boolean()]))
    .refine((settings) => Object.keys(settings).length <= MAX_SETTINGS, `Use at most ${String(MAX_SETTINGS)} settings.`),
});

const target = z.union([
  z.strictObject({ type: z.literal("event") }),
  z.strictObject({ type: z.enum(["group", "role"]), slug: z.string().min(1).max(100), name: z.string().max(200).optional() }),
]);

const takContent = z.strictObject({
  atakVersion: z.string().max(40).optional(),
  atakPreferences: z
    .array(
      z.strictObject({
        target,
        preference: z.string().min(1).max(200),
        key: safeKey,
        type: z.enum(["string", "boolean", "integer", "long", "float"]),
        value: z.string().max(10_000),
      }),
    )
    .max(MAX_ATAK_ENTRIES),
});

const documentSchema = z
  .strictObject({
    format: z.literal(PRESET_FORMAT),
    formatVersion: z.literal(PRESET_FORMAT_VERSION),
    kind: z.enum(["meshtastic", "tak"]),
    name: z.string().trim().min(1).max(100),
    description: z.string().max(1000).optional(),
    about: z.string().max(4000).optional(),
    exportedAt: z.iso.datetime({ offset: true }).optional(),
    source: z
      .strictObject({
        application: z.string().max(100).optional(),
        applicationVersion: z.string().max(40).optional(),
        exportedFrom: z.enum(["event", "library"]).optional(),
        note: z.string().max(1000).optional(),
      })
      .optional(),
    meshtastic: meshtasticContent.optional(),
    tak: takContent.optional(),
  })
  .superRefine((document, context) => {
    const own = document.kind === "meshtastic" ? document.meshtastic : document.tak;
    const other = document.kind === "meshtastic" ? document.tak : document.meshtastic;
    if (own === undefined) {
      context.addIssue({ code: "custom", path: [document.kind], message: `A ${document.kind} preset needs a "${document.kind}" section.` });
    }
    if (other !== undefined) {
      context.addIssue({ code: "custom", path: [document.kind === "meshtastic" ? "tak" : "meshtastic"], message: "Keep TAK and Meshtastic presets in separate files." });
    }
  });

export type MeshtasticPresetContent = z.infer<typeof meshtasticContent>;
export type TakPresetContent = z.infer<typeof takContent>;
export type PresetAtakTarget = z.infer<typeof target>;
export type PresetDocument = z.infer<typeof documentSchema>;

function problemsOf(error: z.ZodError, prefix: string): ProblemFieldError[] {
  return error.issues.slice(0, 50).map((issue) => {
    const path = issue.path.map((part) => (typeof part === "number" ? `[${String(part)}]` : `.${String(part)}`)).join("");
    const unsupportedVersion = issue.path.length === 1 && issue.path[0] === "formatVersion";
    return {
      field: `${prefix}${path}`,
      code: unsupportedVersion ? "UNSUPPORTED_FORMAT_VERSION" : "INVALID_PRESET",
      message: unsupportedVersion ? `This OpenMeshTak release reads preset format version ${String(PRESET_FORMAT_VERSION)}.` : issue.message,
    };
  });
}

/**
 * Validates an untrusted preset document: size, format and version, known fields only, and no key
 * that could reach an object prototype. Content checks against an event or catalog come later.
 */
export function parsePresetDocument(input: unknown, prefix = "document"): PresetDocument {
  if (Buffer.byteLength(JSON.stringify(input ?? null), "utf8") > MAX_PRESET_BYTES) {
    throw validationProblem([{ field: prefix, code: "PRESET_TOO_LARGE", message: "The preset is larger than 512 KB." }]);
  }
  const parsed = documentSchema.safeParse(input);
  if (!parsed.success) {
    throw validationProblem(problemsOf(parsed.error, prefix));
  }
  return parsed.data;
}

/** The kind-specific section of a document; parsing guarantees it exists. */
export function meshtasticContentOf(document: PresetDocument): MeshtasticPresetContent {
  if (document.meshtastic === undefined) {
    throw validationProblem([{ field: "document.kind", code: "WRONG_PRESET_KIND", message: "This is not a Meshtastic preset." }]);
  }
  return document.meshtastic;
}

export function takContentOf(document: PresetDocument): TakPresetContent {
  if (document.tak === undefined) {
    throw validationProblem([{ field: "document.kind", code: "WRONG_PRESET_KIND", message: "This is not a TAK preset." }]);
  }
  return document.tak;
}

export function requireKind(document: PresetDocument, kind: PresetDocument["kind"]): void {
  if (document.kind !== kind) {
    throw validationProblem([
      { field: "document.kind", code: "WRONG_PRESET_KIND", message: `Import a ${kind === "tak" ? "TAK" : "Meshtastic"} preset here.` },
    ]);
  }
}

/** A complete portable document around one kind's content. */
export function presetDocument(
  fields: { kind: PresetDocument["kind"]; name: string; description: string | null; exportedFrom: "event" | "library" },
  content: { meshtastic: MeshtasticPresetContent } | { tak: TakPresetContent },
): PresetDocumentDto {
  return {
    format: PRESET_FORMAT,
    formatVersion: PRESET_FORMAT_VERSION,
    kind: fields.kind,
    name: fields.name,
    ...(fields.description === null ? {} : { description: fields.description }),
    about: PRESET_ABOUT,
    exportedAt: new Date().toISOString(),
    source: { application: "OpenMeshTak", exportedFrom: fields.exportedFrom },
    ...content,
  };
}
