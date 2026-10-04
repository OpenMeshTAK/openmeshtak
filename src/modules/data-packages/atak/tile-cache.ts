import { randomUUID } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import Database from "better-sqlite3";
import { strFromU8, unzipSync } from "fflate";

/**
 * Read-only access to ATAK SQLite tile caches: table `tiles(key, provider, tile)` in Web Mercator,
 * where the key packs zoom, column and row as `((z * 2^z) + x) * 2^z + y` with XYZ rows (verified
 * against real ATAK tile caches). Arithmetic is used instead of bit shifts because the keys exceed
 * 32 bits from zoom 16 on.
 */
export interface TileCacheSummary {
  minZoom: number;
  maxZoom: number;
  /** West, south, east, north in WGS84 degrees, from the tiles at the highest zoom. */
  bounds: [number, number, number, number];
  tiles: number;
}

export interface Tile {
  bytes: Uint8Array;
  mediaType: "image/png" | "image/jpeg";
}

const MAX_ZOOM = 24;
const MAX_NESTING_DEPTH = 2;
const extractionRoot = join(tmpdir(), "openmeshtak-tile-caches");
const open = new Map<string, Database.Database>();
const summaries = new Map<string, TileCacheSummary | null>();

function tileKey(z: number, x: number, y: number): number {
  const size = 2 ** z;
  return (z * size + x) * size + y;
}

function decodeKey(key: number): { z: number; x: number; y: number } | null {
  for (let z = 0; z <= MAX_ZOOM; z += 1) {
    const size = 2 ** z;
    if (key >= z * size * size && key < (z * size + size) * size) {
      return { z, x: Math.floor(key / size) - z * size, y: key % size };
    }
  }
  return null;
}

function longitude(x: number, z: number): number {
  return (x / 2 ** z) * 360 - 180;
}

function latitude(y: number, z: number): number {
  const n = Math.PI - (2 * Math.PI * y) / 2 ** z;
  return (180 / Math.PI) * Math.atan(Math.sinh(n));
}

function isSqlite(bytes: Uint8Array): boolean {
  return strFromU8(bytes.subarray(0, 16)) === "SQLite format 3\0";
}

/** The first tile cache inside a (possibly nested) Data Package, within a small fixed depth. */
function nestedTileCache(bytes: Uint8Array, depth: number): Uint8Array | null {
  if (depth > MAX_NESTING_DEPTH) {
    return null;
  }
  let files: Record<string, Uint8Array>;
  try {
    files = unzipSync(bytes);
  } catch {
    return null;
  }
  for (const content of Object.values(files)) {
    if (isSqlite(content)) {
      return content;
    }
    if (content[0] === 0x50 && content[1] === 0x4b) {
      const inner = nestedTileCache(content, depth + 1);
      if (inner !== null) {
        return inner;
      }
    }
  }
  return null;
}

/**
 * SQLite needs a file. Plain caches are opened in place; caches inside nested packages are
 * extracted once into a temporary directory outside the persistent data root.
 */
function databaseFile(blobId: string, storedPath: string, nested: boolean): string | null {
  if (!nested) {
    return storedPath;
  }
  const extracted = join(extractionRoot, `${blobId}.sqlite`);
  if (!existsSync(extracted)) {
    const inner = nestedTileCache(new Uint8Array(readFileSync(storedPath)), 1);
    if (inner === null) {
      return null;
    }
    mkdirSync(extractionRoot, { recursive: true, mode: 0o700 });
    const temporary = `${extracted}.${randomUUID()}.tmp`;
    writeFileSync(temporary, inner, { mode: 0o600 });
    renameSync(temporary, extracted);
  }
  return extracted;
}

function openCache(blobId: string, storedPath: string, nested: boolean): Database.Database | null {
  const cached = open.get(blobId);
  if (cached !== undefined) {
    return cached;
  }
  const file = databaseFile(blobId, storedPath, nested);
  if (file === null) {
    return null;
  }
  try {
    const database = new Database(file, { readonly: true, fileMustExist: true });
    database.prepare("SELECT key, tile FROM tiles LIMIT 1").get();
    open.set(blobId, database);
    return database;
  } catch {
    return null;
  }
}

export function tileCacheSummary(blobId: string, storedPath: string, nested: boolean): TileCacheSummary | null {
  if (summaries.has(blobId)) {
    return summaries.get(blobId) ?? null;
  }
  const database = openCache(blobId, storedPath, nested);
  const tiles = database === null
    ? []
    : (database.prepare("SELECT key FROM tiles").all() as Array<{ key: number }>).flatMap(({ key }) => decodeKey(Number(key)) ?? []);
  let summary: TileCacheSummary | null = null;
  if (tiles.length > 0) {
    const maxZoom = Math.max(...tiles.map(({ z }) => z));
    const top = tiles.filter(({ z }) => z === maxZoom);
    const xs = top.map(({ x }) => x);
    const ys = top.map(({ y }) => y);
    summary = {
      minZoom: Math.min(...tiles.map(({ z }) => z)),
      maxZoom,
      bounds: [
        longitude(Math.min(...xs), maxZoom),
        latitude(Math.max(...ys) + 1, maxZoom),
        longitude(Math.max(...xs) + 1, maxZoom),
        latitude(Math.min(...ys), maxZoom),
      ],
      tiles: tiles.length,
    };
  }
  summaries.set(blobId, summary);
  return summary;
}

/** One tile, only when its bytes really are a PNG or JPEG image. */
export function readTile(blobId: string, storedPath: string, nested: boolean, z: number, x: number, y: number): Tile | null {
  const database = openCache(blobId, storedPath, nested);
  const row = database?.prepare("SELECT tile FROM tiles WHERE key = ?").get(tileKey(z, x, y)) as { tile?: Uint8Array } | undefined;
  const bytes = row?.tile;
  if (bytes === undefined || !(bytes instanceof Uint8Array)) {
    return null;
  }
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) {
    return { bytes, mediaType: "image/png" };
  }
  return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff ? { bytes, mediaType: "image/jpeg" } : null;
}

/** Closes and forgets a cache, for example before its stored file is deleted. */
export function forgetTileCache(blobId: string): void {
  open.get(blobId)?.close();
  open.delete(blobId);
  summaries.delete(blobId);
  rmSync(join(extractionRoot, `${blobId}.sqlite`), { force: true });
}
