import { strFromU8, strToU8, unzipSync, zipSync, type Zippable } from "fflate";
import { XMLBuilder, XMLParser } from "fast-xml-parser";
import { ProblemError } from "../../../shared/errors/problem-error.js";
import type { ImportReportEntry } from "../package-import.dto.js";

/** Upload limit includes the 49 MB real offline-map fixture. */
export const MAX_UPLOAD_BYTES = 64 * 1024 * 1024;
const MAX_ENTRIES = 2_000;
const MAX_COT_BYTES = 2 * 1024 * 1024;
const MAX_CONTENT_BYTES = 64 * 1024 * 1024;
const MAX_TOTAL_BYTES = 128 * 1024 * 1024;
const MAX_NESTING_DEPTH = 2;
const MANIFEST_PATH = "MANIFEST/manifest.xml";

export interface CotFile {
  /** Archive path, used in the import report. */
  path: string;
  xml: string;
}

export interface ReadDataPackage {
  name: string | null;
  cotFiles: CotFile[];
  contentFiles: PackageContentFile[];
  skipped: ImportReportEntry[];
}

export interface PackageContentFile {
  path: string;
  name: string;
  kind: "offline-map" | "nested-data-package";
  mediaType: "application/x-sqlite3" | "application/zip";
  bytes: Uint8Array;
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

function isSqlite(bytes: Uint8Array): boolean {
  return strFromU8(bytes.subarray(0, 16)) === "SQLite format 3\0";
}

/** Archive paths are untrusted; nothing is written to disk, but odd paths are reported. */
function unsafePath(path: string): boolean {
  return path.includes("\0") || path.startsWith("/") || path.startsWith("\\") || /(^|[\\/])\.\.([\\/]|$)/.test(path) || /^[a-z]:/i.test(path);
}

function normalizePath(path: string): string | null {
  if (unsafePath(path)) {
    return null;
  }
  const normalized = path
    .replaceAll("\\", "/")
    .split("/")
    .filter((segment) => segment !== "" && segment !== ".")
    .join("/");
  return normalized === "" || normalized.length > 512 || normalized.split("/").some((segment) => segment.length > 255)
    ? null
    : normalized;
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
    if (bytes.length > MAX_COT_BYTES) {
      throw archiveProblem("The CoT file is too large.");
    }
    return { name: null, cotFiles: [{ path: "upload.cot", xml: strFromU8(bytes) }], contentFiles: [], skipped: [] };
  }

  const skipped: ImportReportEntry[] = [];
  const budget = { entries: 0, total: 0 };
  const seen = new Set<string>();
  let files: Record<string, Uint8Array>;
  try {
    files = unzipSync(bytes, {
      filter: (file) => {
        budget.entries += 1;
        budget.total += file.originalSize;
        if (budget.entries > MAX_ENTRIES || budget.total > MAX_TOTAL_BYTES) {
          throw archiveProblem("The Data Package has too many files or is too large when unpacked.");
        }
        if (file.name.endsWith("/")) {
          return false;
        }
        const normalized = normalizePath(file.name);
        if (normalized === null) {
          skipped.push({ feature: file.name, message: "Unsafe archive path." });
          return false;
        }
        if (seen.has(normalized)) {
          throw archiveProblem(`The Data Package contains the duplicate path ${normalized}.`);
        }
        seen.add(normalized);
        const maximum = normalized === MANIFEST_PATH || normalized.toLowerCase().endsWith(".cot") ? MAX_COT_BYTES : MAX_CONTENT_BYTES;
        if (file.originalSize > maximum) {
          skipped.push({ feature: file.name, message: "The file is too large." });
          return false;
        }
        return true;
      },
    });
  } catch (error: unknown) {
    throw error instanceof ProblemError ? error : archiveProblem("The file is not a readable ZIP archive.");
  }

  const normalizedFiles = Object.entries(files).map(([path, content]) => [normalizePath(path)!, content] as const);
  const cotFiles = normalizedFiles
    .filter(([path]) => path !== MANIFEST_PATH && path.toLowerCase().endsWith(".cot"))
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([path, content]) => ({ path, xml: strFromU8(content) }));
  const contentFiles: PackageContentFile[] = [];
  for (const [path, content] of normalizedFiles) {
    if (path === MANIFEST_PATH || path.toLowerCase().endsWith(".cot")) {
      continue;
    }
    if (isSqlite(content)) {
      contentFiles.push({ path, name: path.split("/").at(-1)!, kind: "offline-map", mediaType: "application/x-sqlite3", bytes: content });
    } else if (isZip(content) && nestedPackageContainsOfflineMap(content, 1, budget)) {
      contentFiles.push({ path, name: path.split("/").at(-1)!, kind: "nested-data-package", mediaType: "application/zip", bytes: content });
    } else {
      skipped.push({ feature: path, message: "This attachment type is not supported yet." });
    }
  }
  const manifest = normalizedFiles.find(([path]) => path === MANIFEST_PATH)?.[1];
  return { name: manifestName(manifest === undefined ? undefined : strFromU8(manifest)), cotFiles, contentFiles, skipped };
}

function nestedPackageContainsOfflineMap(
  bytes: Uint8Array,
  depth: number,
  budget: { entries: number; total: number },
): boolean {
  if (depth > MAX_NESTING_DEPTH) {
    return false;
  }
  const seen = new Set<string>();
  let files: Record<string, Uint8Array>;
  try {
    files = unzipSync(bytes, {
      filter: (file) => {
        budget.entries += 1;
        budget.total += file.originalSize;
        if (budget.entries > MAX_ENTRIES || budget.total > MAX_TOTAL_BYTES) {
          throw archiveProblem("Nested Data Packages have too many files or are too large when unpacked.");
        }
        if (file.name.endsWith("/")) {
          return false;
        }
        const normalized = normalizePath(file.name);
        if (normalized === null || seen.has(normalized)) {
          throw archiveProblem("A nested Data Package contains an unsafe or duplicate path.");
        }
        seen.add(normalized);
        return file.originalSize <= MAX_CONTENT_BYTES;
      },
    });
  } catch (error: unknown) {
    if (error instanceof ProblemError) {
      throw error;
    }
    return false;
  }
  return Object.values(files).some(
    (content) => isSqlite(content) || (isZip(content) && nestedPackageContainsOfflineMap(content, depth + 1, budget)),
  );
}

export interface DataPackageContent {
  /** Stable package UID; ATAK replaces an earlier import with the same UID. */
  uid: string;
  name: string;
  events: Array<{ uid: string; xml: string }>;
  files?: Array<{ path: string; bytes: Uint8Array }>;
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
        Content: [
          ...content.events.map((event) => ({
            "@_zipEntry": `${event.uid}/${event.uid}.cot`,
            "@_ignore": "false",
            Parameter: parameter("uid", event.uid),
          })),
          ...(content.files ?? []).map((file) => ({ "@_zipEntry": file.path, "@_ignore": "false" })),
        ],
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
  for (const file of content.files ?? []) {
    files[file.path] = file.bytes;
  }
  return zipSync(files, { level: 6, mtime: modifiedAt });
}
