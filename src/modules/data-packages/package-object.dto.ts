import type { Uuid } from "../../shared/http/uuid.js";
import type { PageInfo } from "../../shared/pagination/cursor.js";

/**
 * GeoJSON position: `[longitude, latitude]` or `[longitude, latitude, altitudeMetresHae]`.
 * @minItems 2
 * @maxItems 3
 */
export type Position = number[];

export interface PointGeometry {
  type: "Point";
  coordinates: Position;
}

export interface LineStringGeometry {
  type: "LineString";
  coordinates: Position[];
}

export interface PolygonGeometry {
  type: "Polygon";
  /** Outer ring first, then holes; every ring repeats its first position at the end. */
  coordinates: Position[][];
}

/**
 * A true circle, which GeoJSON cannot express: centre plus radius in metres. It is never stored as
 * a silently approximated polygon and maps to ATAK `u-d-c-c` circles.
 */
export interface CircleGeometry {
  type: "Circle";
  /** Centre position. */
  coordinates: Position;
  /**
   * Radius in metres.
   * @minimum 0.1
   * @maximum 100000
   */
  radius: number;
}

/** RFC 7946 geometry in WGS84, plus circles as an explicit domain extension. */
export type PackageGeometry = PointGeometry | LineStringGeometry | PolygonGeometry | CircleGeometry;

export type PackageObjectKind = "point" | "line" | "polygon" | "circle";

/**
 * Colour as `#RRGGBB`.
 * @pattern ^#[0-9A-Fa-f]{6}$
 */
export type HexColor = string;

export interface PackageObjectStyle {
  /** Marker, line and polygon outline colour. */
  color: HexColor;
  /**
   * Line and outline width in pixels.
   * @isInt
   * @minimum 1
   * @maximum 20
   */
  strokeWidth: number;
  /**
   * Polygon fill opacity; the fill uses `color`.
   * @minimum 0
   * @maximum 1
   */
  fillOpacity: number;
}

/**
 * CoT event type, e.g. `b-m-p-s-m` (spot marker) or `a-f-G-U-C-I` (MIL-STD-2525 friendly
 * infantry).
 * @pattern ^[a-z](-[A-Za-z0-9]+){1,15}$
 * @maxLength 64
 */
export type CotType = string;

/** Optional TAK presentation of a marker, kept so ATAK packages round-trip without loss. */
export interface TakMarker {
  /** Defaults to the spot marker `b-m-p-s-m`; `a-*` types are drawn as military symbols. */
  cotType: CotType;
  /**
   * ATAK icon set path such as `COT_MAPPING_SPOTMAP/b-m-p-s-m/-35072` or an icon in a custom
   * icon set. Passed through unchanged; the editor shows a plain marker when it cannot draw it.
   * @pattern ^[^\u0000-\u001f<>"]+$
   * @maxLength 256
   */
  iconsetPath: string | null;
}

export interface PackageObjectDto {
  id: Uuid;
  packageId: Uuid;
  layerId: Uuid;
  kind: PackageObjectKind;
  name: string;
  description: string | null;
  geometry: PackageGeometry;
  style: PackageObjectStyle;
  /** Only markers carry TAK metadata; `null` means a plain spot marker. */
  tak: TakMarker | null;
  version: number;
  /** @format date-time */
  createdAt: string;
  /** @format date-time */
  updatedAt: string;
}

export interface PackageObjectPage {
  items: PackageObjectDto[];
  page: PageInfo;
}

export interface CreatePackageObjectRequest {
  layerId: Uuid;
  /**
   * @minLength 1
   * @maxLength 100
   */
  name: string;
  /** @maxLength 2000 */
  description?: string | null;
  geometry: PackageGeometry;
  /** Defaults to a blue outline with a light fill. */
  style?: PackageObjectStyle;
  /** Markers only. */
  tak?: TakMarker | null;
}

export interface UpdatePackageObjectRequest {
  /**
   * @isInt
   * @minimum 1
   */
  version: number;
  /** Moving an object to another layer of the same data package is allowed. */
  layerId: Uuid;
  /**
   * @minLength 1
   * @maxLength 100
   */
  name: string;
  /** @maxLength 2000 */
  description: string | null;
  geometry: PackageGeometry;
  style: PackageObjectStyle;
  /** Markers only; send `null` for a plain spot marker. */
  tak: TakMarker | null;
}
