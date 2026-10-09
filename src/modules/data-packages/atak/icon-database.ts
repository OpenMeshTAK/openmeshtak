import { randomUUID } from "node:crypto";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import Database from "better-sqlite3";
import { zipSync } from "fflate";
import { ProblemError } from "../../../shared/errors/problem-error.js";
import type { PackageIconDto } from "../icon-library.dto.js";
import type { ImportReportEntry } from "../package-import.dto.js";
import { parseTakMarker } from "../tak-marker.js";

export const MAX_ICON_UPLOAD_BYTES = 10 * 1024 * 1024;
const MAX_ICONS = 5000;
const MAX_ICON_BYTES = 256 * 1024;
const MAX_DIMENSION = 512;

interface IconRow {
  iconset_uid: unknown;
  filename: unknown;
  groupName: unknown;
  type2525b: unknown;
  size: number;
  bitmap: unknown;
}

function invalidDatabase(detail: string): ProblemError {
  return new ProblemError({ type: "urn:openmeshtak:problem:invalid-icon-database", title: "Invalid icon database", status: 422, code: "INVALID_ICON_DATABASE", detail });
}

/** Path components are metadata, never filesystem paths or SQL identifiers. */
function component(value: unknown, maximum: number): string | null {
  return typeof value === "string" && value.length > 0 && value.length <= maximum
    && !/[\u0000-\u001f<>"/\\]/.test(value) && value !== "." && value !== ".." ? value : null;
}

/** Only bounded PNGs are served. SVG and arbitrary database blobs never reach the browser. */
export function iconDimensions(bytes: Uint8Array): { width: number; height: number } | null {
  const data = Buffer.from(bytes);
  if (data.length < 45 || data.length > MAX_ICON_BYTES
    || data.subarray(0, 8).toString("hex") !== "89504e470d0a1a0a"
    || data.readUInt32BE(8) !== 13 || data.subarray(12, 16).toString("ascii") !== "IHDR") return null;
  const width = data.readUInt32BE(16);
  const height = data.readUInt32BE(20);
  if (width === 0 || height === 0 || width > MAX_DIMENSION || height > MAX_DIMENSION) return null;
  let offset = 8;
  let hasPixels = false;
  while (offset + 12 <= data.length) {
    const size = data.readUInt32BE(offset);
    const type = data.subarray(offset + 4, offset + 8).toString("ascii");
    if (size > data.length - offset - 12) return null;
    if (type === "IDAT") hasPixels = true;
    offset += size + 12;
    if (type === "IEND") return size === 0 && offset === data.length && hasPixels ? { width, height } : null;
  }
  return null;
}

function readIcons(database: Database.Database): { icons: PackageIconDto[]; images: Record<string, Uint8Array>; rejected: ImportReportEntry[] } {
  // Never query attacker-supplied views or virtual tables, or evaluate schema expressions.
  database.pragma("trusted_schema = OFF");
  database.pragma("query_only = ON");
  const tables = database.prepare("SELECT name, type, sql FROM sqlite_schema WHERE name IN ('iconsets', 'icons')").all() as Array<{ name: string; type: string; sql: string }>;
  if (tables.length !== 2 || tables.some((table) => table.type !== "table" || !/^CREATE\s+TABLE\b/i.test(table.sql))) {
    throw invalidDatabase("Expected ordinary WinTAK iconsets and icons tables.");
  }
  for (const table of ["iconsets", "icons"]) {
    const columns = database.pragma(`table_xinfo('${table}')`) as Array<{ hidden: number }>;
    if (columns.some((column) => column.hidden !== 0)) throw invalidDatabase("Computed and hidden icon database columns are not supported.");
  }
  const sets = database.prepare("SELECT uid, name FROM iconsets LIMIT 101").all() as Array<{ uid: unknown; name: unknown }>;
  if (sets.length > 100) throw invalidDatabase("At most 100 icon sets are supported per upload.");
  const names = new Map<string, string>();
  for (const set of sets) {
    const uid = component(set.uid, 128);
    const name = component(set.name, 100);
    if (uid !== null && name !== null && !names.has(uid)) names.set(uid, name);
  }
  // Oversized blobs are not materialized. LIMIT bounds the result even on a malicious schema.
  const rows = database.prepare(`SELECT iconset_uid, filename, groupName, type2525b,
    length(bitmap) AS size, CASE WHEN length(bitmap) <= ${MAX_ICON_BYTES} THEN bitmap ELSE NULL END AS bitmap
    FROM icons LIMIT ${MAX_ICONS + 1}`).all() as IconRow[];
  if (rows.length > MAX_ICONS) throw invalidDatabase(`At most ${MAX_ICONS} icons are supported per upload.`);
  const icons: PackageIconDto[] = [];
  const images: Record<string, Uint8Array> = {};
  const rejected: ImportReportEntry[] = [];
  const paths = new Set<string>();
  let total = 0;
  for (const [index, row] of rows.entries()) {
    const uid = component(row.iconset_uid, 128);
    const group = component(row.groupName, 100);
    const filename = component(row.filename, 128);
    const path = uid !== null && group !== null && filename !== null ? `${uid}/${group}/${filename}` : null;
    const dimensions = row.bitmap instanceof Uint8Array ? iconDimensions(row.bitmap) : null;
    if (path === null || path.length > 256 || !names.has(uid!) || dimensions === null || paths.has(path)) {
      rejected.push({ feature: `Icon ${index + 1}`, message: "Invalid or duplicate TAK path, unknown set, or unsupported PNG (maximum 512 × 512 pixels and 256 KB)." });
      continue;
    }
    total += row.size;
    if (total > MAX_ICON_UPLOAD_BYTES) throw invalidDatabase("Extracted icon bytes exceed the 10 MB limit.");
    const id = randomUUID();
    paths.add(path);
    const fallback = typeof row.type2525b === "string" && row.type2525b.length <= 64 ? parseTakMarker(row.type2525b, null)?.cotType ?? null : null;
    icons.push({ id, path, setName: names.get(uid!)!, group: group!, filename: filename!, cotType: fallback, ...dimensions });
    images[`${id}.png`] = row.bitmap as Uint8Array;
  }
  if (icons.length === 0) throw invalidDatabase("The database contains no supported PNG icons.");
  return { icons, images, rejected };
}

/** Reads only the observed WinTAK schema; keeps a canonical image archive, never the input DB. */
export async function readIconDatabase(bytes: Uint8Array): Promise<{ icons: PackageIconDto[]; bytes: Uint8Array; rejected: ImportReportEntry[] }> {
  if (bytes.length > MAX_ICON_UPLOAD_BYTES || Buffer.from(bytes.subarray(0, 16)).toString("ascii") !== "SQLite format 3\0") {
    throw invalidDatabase("Upload a WinTAK iconsets.sqlite database of at most 10 MB.");
  }
  const temporary = await mkdtemp(join(tmpdir(), "openmeshtak-icons-"));
  let database: Database.Database | undefined;
  try {
    const file = join(temporary, "icons.sqlite");
    await writeFile(file, bytes, { flag: "wx", mode: 0o600 });
    database = new Database(file, { readonly: true, fileMustExist: true });
    const result = readIcons(database);
    return { icons: result.icons, bytes: zipSync(result.images, { level: 0 }), rejected: result.rejected };
  } catch (error: unknown) {
    if (error instanceof ProblemError) throw error;
    throw invalidDatabase("The database could not be read as a WinTAK icon set. Close WinTAK before copying the file.");
  } finally {
    try { database?.close(); }
    finally { await rm(temporary, { recursive: true, force: true }); }
  }
}
