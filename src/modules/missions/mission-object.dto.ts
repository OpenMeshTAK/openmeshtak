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

/** RFC 7946 geometry in WGS84. */
export type MissionGeometry = PointGeometry | LineStringGeometry | PolygonGeometry;

export type MissionObjectKind = "point" | "line" | "polygon";

/**
 * Colour as `#RRGGBB`.
 * @pattern ^#[0-9A-Fa-f]{6}$
 */
export type HexColor = string;

export interface MissionObjectStyle {
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

export interface MissionObjectDto {
  id: Uuid;
  missionId: Uuid;
  layerId: Uuid;
  kind: MissionObjectKind;
  name: string;
  description: string | null;
  geometry: MissionGeometry;
  style: MissionObjectStyle;
  version: number;
  /** @format date-time */
  createdAt: string;
  /** @format date-time */
  updatedAt: string;
}

export interface MissionObjectPage {
  items: MissionObjectDto[];
  page: PageInfo;
}

export interface CreateMissionObjectRequest {
  layerId: Uuid;
  /**
   * @minLength 1
   * @maxLength 100
   */
  name: string;
  /** @maxLength 2000 */
  description?: string | null;
  geometry: MissionGeometry;
  /** Defaults to a blue outline with a light fill. */
  style?: MissionObjectStyle;
}

export interface UpdateMissionObjectRequest {
  /**
   * @isInt
   * @minimum 1
   */
  version: number;
  /** Moving an object to another layer of the same mission is allowed. */
  layerId: Uuid;
  /**
   * @minLength 1
   * @maxLength 100
   */
  name: string;
  /** @maxLength 2000 */
  description: string | null;
  geometry: MissionGeometry;
  style: MissionObjectStyle;
}
