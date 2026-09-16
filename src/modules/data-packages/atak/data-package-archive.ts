import { strFromU8, strToU8, unzipSync, zipSync, type Zippable } from "fflate";
import { XMLBuilder, XMLParser } from "fast-xml-parser";
import { ProblemError } from "../../../shared/errors/problem-error.js";
import type { ImportReportEntry } from "../package-import.dto.js";

/** Upload limit for a Data Package or a single CoT file. */
export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
const MAX_ENTRIES = 2_000;
const MAX_ENTRY_BYTES = 2 * 1024 * 1024;
const MAX_TOTAL_BYTES = 50 * 1024 * 1024;
const MANIFEST_PATH = "MANIFEST/manifest.xml";

export interface CotFile {
  /** Archive path, used in the import report. */
  path: string;
  xml: string;
}

export interface ReadDataPackage {
  name: string | null;
  cotFiles: CotFile[];
  skipped: ImportReportEntry[];
}

function archiveProblem(detail: string): ProblemError {
  return new ProblemError({
    type: "urn:openmeshtak:problem:invalid-archive",
    title: "Data Package cannot be read",
    status: 422,
    detail,
    code: "INVALID_ARCHIVE",
  });
}

function isZip(bytes: Uint8Array): boolean {
  return bytes[0] === 0x50 && bytes[1] === 0x4b;
}

/** Archive paths are untrusted; nothing is written to disk, but odd paths are reported. */
function unsafePath(path: string): boolean {
  return path.startsWith("/") || path.startsWith("\\") || /(^|[\\/])\.\.([\\/]|$)/.test(path) || /^[a-z]:/i.test(path);
}

function manifestName(xml: string | undefined): string | null {
  if (xml === undefined || /<!DOCTYPE|<!ENTITY/i.test(xml)) {
    return null;
  }
  try {
    const parsed = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "", isArray: (name) => name === "Parameter" }).parse(
      xml,
    ) as { MissionPackageManifest?: { Configuration?: { Parameter?: Array<{ name?: string; value?: string }> } } };
    const name = parsed.MissionPackageManifest?.Configuration?.Parameter?.find((parameter) => parameter.name === "name")?.value;
    return typeof name === "string" && name.trim() !== "" ? name.trim().slice(0, 100) : null;
  } catch {
    return null;
  }
}

/**
 * Reads an ATAK Data Package (ZIP with `MANIFEST/manifest.xml` and `.cot` entries) or a single CoT
 * file. Size limits are checked against the declared sizes before anything is decompressed, so a
 * decompression bomb is refused instead of filling memory.
 */
export function readDataPackage(bytes: Uint8Array): ReadDataPackage {
  if (!isZip(bytes)) {
    if (bytes.length > MAX_ENTRY_BYTES) {
      throw archiveProblem("The CoT file is too large.");
    }
    return { name: null, cotFiles: [{ path: "upload.cot", xml: strFromU8(bytes) }], skipped: [] };
  }

  const skipped: ImportReportEntry[] = [];
  let entries = 0;
  let total = 0;
  let files: Record<string, Uint8Array>;
  try {
    files = unzipSync(bytes, {
      filter: (file) => {
        entries += 1;
        total += file.originalSize;
        if (entries > MAX_ENTRIES || total > MAX_TOTAL_BYTES) {
          throw archiveProblem("The Data Package has too many files or is too large when unpacked.");
        }
        if (file.name.endsWith("/")) {
          return false;
        }
        if (unsafePath(file.name)) {
          skipped.push({ feature: file.name, message: "Unsafe archive path." });
          return false;
        }
        const wanted = file.name === MANIFEST_PATH || file.name.toLowerCase().endsWith(".cot");
        if (!wanted) {
          skipped.push({ feature: file.name, message: "Attachments and other files are not supported yet." });
          return false;
        }
        if (file.originalSize > MAX_ENTRY_BYTES) {
          skipped.push({ feature: file.name, message: "The file is too large." });
          return false;
        }
        return true;
      },
    });
  } catch (error: unknown) {
    throw error instanceof ProblemError ? error : archiveProblem("The file is not a readable ZIP archive.");
  }

  const cotFiles = Object.entries(files)
    .filter(([path]) => path !== MANIFEST_PATH)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([path, content]) => ({ path, xml: strFromU8(content) }));
  const manifest = files[MANIFEST_PATH];
  return { name: manifestName(manifest === undefined ? undefined : strFromU8(manifest)), cotFiles, skipped };
}

export interface DataPackageContent {
  /** Stable package UID; ATAK replaces an earlier import with the same UID. */
  uid: string;
  name: string;
  events: Array<{ uid: string; xml: string }>;
}

const manifestBuilder = new XMLBuilder({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  format: true,
  suppressEmptyNode: true,
});

function manifestXml(content: DataPackageContent): string {
  const parameter = (name: string, value: string) => ({ "@_name": name, "@_value": value });
  return `<?xml version="1.0" encoding="UTF-8"?>\n${manifestBuilder.build({
    MissionPackageManifest: {
      "@_version": "2",
      Configuration: { Parameter: [parameter("name", content.name), parameter("uid", content.uid)] },
      Contents: {
        Content: content.events.map((event) => ({
          "@_zipEntry": `${event.uid}/${event.uid}.cot`,
          "@_ignore": "false",
          Parameter: parameter("uid", event.uid),
        })),
      },
    },
  })}`;
}

/**
 * Writes a Data Package in the layout of real ATAK packages: `MANIFEST/manifest.xml` (version 2)
 * plus one `<uid>/<uid>.cot` per object. A fixed modification time keeps the ZIP byte-identical
 * for the same revision.
 */
export function writeDataPackage(content: DataPackageContent, modifiedAt: Date): Uint8Array {
  const files: Zippable = { [MANIFEST_PATH]: strToU8(manifestXml(content)) };
  for (const event of content.events) {
    files[`${event.uid}/${event.uid}.cot`] = strToU8(event.xml);
  }
  return zipSync(files, { level: 6, mtime: modifiedAt });
}
