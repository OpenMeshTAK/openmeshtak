/**
 * Value formats found in real ATAK/WinTAK CoT. WinTAK writes some numbers with the Windows locale,
 * so a German installation produces `strokeWeight value="4,5"` and link points such as
 * `52.38418502,11.83233492,82,73679294` (altitude 82.73679294). Parsers accept both forms;
 * exports always use dots.
 */

/** CoT marks an unknown altitude, circular error or linear error with this value. */
export const COT_UNKNOWN = 9_999_999;

export function parseCotNumber(value: unknown): number | null {
  if (typeof value !== "string" && typeof value !== "number") {
    return null;
  }
  if (typeof value === "string" && value.trim() === "") return null;
  const number = Number(String(value).trim().replace(",", "."));
  return Number.isFinite(number) ? number : null;
}

function decimal(whole: string | undefined, fraction: string | undefined): number {
  return Number(fraction === undefined ? whole : `${whole ?? ""}.${fraction}`);
}

/**
 * Reads `lat,lon[,hae]` into a GeoJSON position `[lon, lat(, hae)]`. With a comma decimal
 * separator the field count grows: 4 fields mean only the altitude used a comma, 6 fields mean
 * every value did. Unknown altitude stays absent instead of becoming zero.
 */
export function parseLinkPoint(value: unknown): number[] | null {
  if (typeof value !== "string") {
    return null;
  }
  const parts = value.split(",").map((part) => part.trim());
  let latitude: number;
  let longitude: number;
  let altitude: number | null;

  if (parts.length === 2 || parts.length === 3) {
    latitude = Number(parts[0]);
    longitude = Number(parts[1]);
    altitude = parts.length === 3 ? Number(parts[2]) : null;
  } else if (parts.length === 4 && parts[0]?.includes(".") && parts[1]?.includes(".")) {
    latitude = Number(parts[0]);
    longitude = Number(parts[1]);
    altitude = decimal(parts[2], parts[3]);
  } else if (parts.length === 6) {
    latitude = decimal(parts[0], parts[1]);
    longitude = decimal(parts[2], parts[3]);
    altitude = decimal(parts[4], parts[5]);
  } else {
    return null;
  }

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return null;
  }
  return withAltitude(longitude, latitude, altitude);
}

/** Builds a position and drops unknown or unparsable altitudes. */
export function withAltitude(longitude: number, latitude: number, altitude: number | null): number[] {
  return altitude !== null && Number.isFinite(altitude) && Math.abs(altitude) < COT_UNKNOWN
    ? [longitude, latitude, altitude]
    : [longitude, latitude];
}

export interface CotColor {
  /** `#RRGGBB` */
  color: string;
  /** 0..1 */
  alpha: number;
}

/** CoT colours are signed 32-bit ARGB integers, e.g. `-16777089` is opaque `#00007F`. */
export function parseArgb(value: unknown): CotColor | null {
  const number = parseCotNumber(value);
  if (number === null || !Number.isInteger(number)) {
    return null;
  }
  const unsigned = number >>> 0;
  const rgb = (unsigned & 0xff_ffff).toString(16).padStart(6, "0").toUpperCase();
  return { color: `#${rgb}`, alpha: Math.round(((unsigned >>> 24) / 255) * 100) / 100 };
}

export function toArgb(color: string, alpha: number): number {
  const rgb = Number.parseInt(color.slice(1), 16);
  const alphaByte = Math.round(Math.min(1, Math.max(0, alpha)) * 255);
  // `| 0` turns the unsigned value into the signed integer ATAK writes.
  return ((alphaByte << 24) | rgb) | 0;
}
