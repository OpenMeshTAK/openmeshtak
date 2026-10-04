import { strFromU8, unzipSync } from "fflate";
import { XMLParser } from "fast-xml-parser";

/**
 * ATAK rubber sheets travel as KMZ files: `doc.kml` with one `GroundOverlay` plus the image it
 * references. Real ATAK exports place the image with a `gx:LatLonQuad`, four corners
 * counter-clockwise from the lower left; `LatLonBox` is accepted as the axis-aligned form.
 */
export interface RubberSheet {
  name: string;
  /** Path of the image inside the KMZ. */
  imagePath: string;
  imageMediaType: "image/png" | "image/jpeg";
  /** Lower left, lower right, upper right, upper left as [longitude, latitude]. */
  corners: Array<[number, number]>;
}

const MAX_KML_BYTES = 1024 * 1024;
const MAX_IMAGE_BYTES = 64 * 1024 * 1024;

const parser = new XMLParser({ ignoreAttributes: true, removeNSPrefix: true, processEntities: false });

function imageMediaType(bytes: Uint8Array): RubberSheet["imageMediaType"] | null {
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) {
    return "image/png";
  }
  return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff ? "image/jpeg" : null;
}

function validCorner([longitude, latitude]: [number, number]): boolean {
  return Number.isFinite(longitude) && Number.isFinite(latitude) && Math.abs(longitude) <= 180 && Math.abs(latitude) <= 90;
}

function quadCorners(text: unknown): Array<[number, number]> | null {
  if (typeof text !== "string") {
    return null;
  }
  const corners = text
    .trim()
    .split(/\s+/)
    .map((tuple) => tuple.split(",").slice(0, 2).map(Number) as [number, number]);
  return corners.length === 4 && corners.every(validCorner) ? corners : null;
}

/** LatLonBox rotation is ignored on purpose until a real export with rotation is available. */
function boxCorners(box: unknown): Array<[number, number]> | null {
  const { north, south, east, west } = (box ?? {}) as Record<string, unknown>;
  const [n, s, e, w] = [north, south, east, west].map(Number) as [number, number, number, number];
  const corners: Array<[number, number]> = [[w, s], [e, s], [e, n], [w, n]];
  return corners.every(validCorner) && n > s ? corners : null;
}

/** Reads a rubber sheet from KMZ bytes, or returns null when the file is not one. */
export function readRubberSheet(kmz: Uint8Array): RubberSheet | null {
  let files: Record<string, Uint8Array>;
  try {
    files = unzipSync(kmz, {
      filter: (file) => file.originalSize <= MAX_IMAGE_BYTES && !file.name.includes(".."),
    });
  } catch {
    return null;
  }
  const kmlEntry = Object.entries(files).find(([path]) => path.toLowerCase().endsWith(".kml"));
  if (kmlEntry === undefined || kmlEntry[1].length > MAX_KML_BYTES) {
    return null;
  }

  let overlay: Record<string, unknown> | undefined;
  try {
    const document = parser.parse(strFromU8(kmlEntry[1])) as { kml?: Record<string, unknown> };
    const root = document.kml ?? {};
    const container = (root.Document ?? root.Folder ?? root) as Record<string, unknown>;
    const found = container.GroundOverlay ?? root.GroundOverlay;
    overlay = (Array.isArray(found) ? found[0] : found) as Record<string, unknown> | undefined;
  } catch {
    return null;
  }
  if (overlay === undefined) {
    return null;
  }

  const href = (overlay.Icon as { href?: unknown } | undefined)?.href;
  const image = typeof href === "string" ? files[href.trim()] : undefined;
  const mediaType = image === undefined ? null : imageMediaType(image);
  const corners = quadCorners((overlay.LatLonQuad as { coordinates?: unknown } | undefined)?.coordinates) ?? boxCorners(overlay.LatLonBox);
  if (typeof href !== "string" || mediaType === null || corners === null) {
    return null;
  }
  const name = typeof overlay.name === "string" && overlay.name.trim() !== "" ? overlay.name.trim() : "Rubber sheet";
  return { name: name.slice(0, 200), imagePath: href.trim(), imageMediaType: mediaType, corners };
}

/** The image of a stored rubber sheet, for display; null when the KMZ no longer matches. */
export function rubberSheetImage(kmz: Uint8Array, imagePath: string): Uint8Array | null {
  try {
    const files = unzipSync(kmz, { filter: (file) => file.name === imagePath && file.originalSize <= MAX_IMAGE_BYTES });
    return files[imagePath] ?? null;
  } catch {
    return null;
  }
}
