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

/** Source-confirmed 2525D control measures; this deliberately excludes single-point symbols. */
export interface TacticalGraphicStyle {
  /** @pattern ^11[0-9]{18}$ */
  sidc: string;
  /** Native __milsym unitmodifier codes, bounded and validated against the selected graphic. */
  modifiers: Record<string, string>;
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

export interface RectangleGeometry {
  type: "Rectangle";
  /** Four corners in drawing order, without a repeated closing position. */
  coordinates: Position[];
}

export interface EllipseGeometry {
  type: "Ellipse";
  /** Centre; axes are semi-axis lengths, matching TAK's ellipse major/minor. */
  coordinates: Position;
  /**
   * @minimum 0.1
   * @maximum 100000
   */
  major: number;
  /**
   * @minimum 0.1
   * @maximum 100000
   */
  minor: number;
  /** Bearing of the major axis clockwise from north, in degrees.
   * @minimum 0
   * @maximum 360
   */
  rotation: number;
}

/**
 * TAK routes refer to their own stable point identifiers in navigation cues.
 * @minLength 1
 * @maxLength 128
 * @pattern ^[^\u0000-\u001f]+$
 */
export type RoutePointId = string;

export interface RoutePoint {
  id: RoutePointId;
  type: "waypoint" | "checkpoint";
  /** @maxLength 100 */
  name: string;
  /** @maxLength 2000 */
  remarks: string;
}

/** @maxLength 64 */
export type RouteOption = string;

export interface RouteOptions {
  transportationType?: RouteOption;
  method?: RouteOption;
  direction?: RouteOption;
  routeType?: RouteOption;
  order?: RouteOption;
  planningMethod?: RouteOption;
  prefix?: RouteOption;
}

export interface RouteCueTrigger {
  mode: "d" | "t";
  /**
   * @isInt
   * @minimum 0
   * @maximum 2147483647
   */
  value: number;
}

export interface RouteNavigationCue {
  pointId: RoutePointId;
  /** @maxLength 2000 */
  text: string;
  /** @maxLength 2000 */
  voice: string;
  /** @maxItems 16 */
  triggers: RouteCueTrigger[];
}

export interface RouteGeometry {
  type: "Route";
  /** Ordered route positions; each has matching metadata in `points`. */
  coordinates: Position[];
  /** @maxItems 10000 */
  points: RoutePoint[];
  options: RouteOptions;
  /** @maxItems 1000 */
  navigationCues: RouteNavigationCue[];
}

/** RFC 7946 semantics in WGS84, with explicit parametric shapes and ordered TAK routes. */
export type PackageGeometry = PointGeometry | LineStringGeometry | PolygonGeometry | CircleGeometry | RectangleGeometry | EllipseGeometry | RouteGeometry;

export type PackageObjectKind = "point" | "line" | "polygon" | "circle" | "rectangle" | "ellipse" | "route";

/**
 * Colour as `#RRGGBB`.
 * @pattern ^#[0-9A-Fa-f]{6}$
 */
export type HexColor = string;

/** How lines, outlines and circles are drawn; ATAK writes it as `strokeStyle`. */
export type StrokeStyle = "solid" | "dashed" | "dotted" | "outlined" | "custom";

/** ATAK Span display units; the stored height itself is always metres. */
export type HeightUnit = 0 | 1 | 2 | 3 | 4 | 5;
export type ExtrudeMode = "cylinder" | "cone_down";
export type ArrowHeads = "none" | "start" | "end" | "both";
export type DistanceUnit = "m" | "km" | "ft" | "mi" | "nm";
export interface SectorStyle {
  /** True heading clockwise from north.
   * @minimum 0
   * @maximum 360 */
  heading: number;
  /** @minimum 1
   * @maximum 360 */
  sweep: number;
  /** Metres.
   * @minimum 0.1
   * @maximum 100000 */
  radius: number;
  /**
   * @minimum 1
   * @maximum 60000
   */
  rangeLines?: number | null;
  displayLabels?: boolean;
  visible?: boolean;
}

export interface BullseyeStyle {
  /**
   * @minimum 0.1
   * @maximum 100000
   */
  ringDistance: number;
  /**
   * @isInt
   * @minimum 1
   * @maximum 10
   */
  ringCount: number;
  ringsVisible: boolean;
  edgeToCenter: boolean;
}

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
   * Polygon and circle fill opacity.
   * @minimum 0
   * @maximum 1
   */
  fillOpacity: number;
  /** Line style of lines, outlines and circles; `solid` when left out. */
  strokeStyle?: StrokeStyle;
  /** Fill colour of areas and circles; `null` or left out fills with `color`. */
  fillColor?: HexColor | null;
  /**
   * Shape extrusion height in metres, independent of coordinate altitude. Null/absent is unknown.
   * @minimum -100000
   * @maximum 100000
   */
  height?: number | null;
  /** Preferred TAK height display unit (0 km, 1 m, 2 mi, 3 yd, 4 ft, 5 NM). */
  heightUnit?: HeightUnit | null;
  /** Circle extrusion mode; absent uses the client's default. */
  extrudeMode?: ExtrudeMode | null;
  /** Endpoint arrowheads for lines; absent means none. CoT/KML export the underlying line. */
  arrowHeads?: ArrowHeads;
  /** Arrowhead length in screen pixels, independent of map zoom.
   * @isInt
   * @minimum 6
   * @maximum 64
   */
  arrowHeadSize?: number;
  /** Direction indicators following route point order; absent means false. Web presentation only. */
  routeDirectionArrows?: boolean;
  /** Distance between route indicators in screen pixels.
   * @isInt
   * @minimum 24
   * @maximum 256
   */
  routeArrowSpacing?: number;
  /** Saved, exactly two-point true Range & Bearing line. */
  rangeBearing?: boolean;
  distanceUnit?: DistanceUnit;
  /** Coverage sector centred at a Point; polygon export is an approximation. */
  sector?: SectorStyle | null;
  /** Full corridor width in metres around a line/route; null disables it.
   * @minimum 1
   * @maximum 10000 */
  corridorWidth?: number | null;
  /** Alternating dash/gap lengths in screen pixels; custom line style only.
   * @minItems 2
   * @maxItems 8 */
  dashPattern?: number[] | null;
  /** Marker hideLabel / shape labels_on; defaults to visible. */
  labelVisible?: boolean;
  /** Native u-r-b-c-c presentation of Circle geometry. */
  rangeCircle?: boolean;
  /**
   * @isInt
   * @minimum 1
   * @maximum 10
   */
  rangeRings?: number;
  bullseye?: BullseyeStyle | null;
  bearingUnit?: "degrees" | "mils" | "radians" | "warsaw-mils" | "streck" | "clock";
  /** Distance outside a shape in metres; native MSD. Incompatible with route/R&B/bullseye.
   * @minimum 0.1
   * @maximum 5000
   */
  minimumSafeDistance?: number | null;
  msdColor?: HexColor | null;
  tacticalGraphic?: TacticalGraphicStyle | null;
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

/** Atomic changes in one draft. Any conflict or locked layer rejects the entire batch. */
export interface BatchPackageObjectsRequest {
  /** @maxItems 500 */
  updates: BatchPackageObjectUpdate[];
  /** @maxItems 500 */
  deletes: BatchPackageObjectDelete[];
  /**
   * Restores deleted objects with new server IDs, in request order.
   * @maxItems 500
   */
  creates: CreatePackageObjectRequest[];
}

export interface BatchPackageObjectUpdate extends UpdatePackageObjectRequest { id: Uuid }
export interface BatchPackageObjectDelete {
  id: Uuid;
  /**
   * @isInt
   * @minimum 1
   */
  version: number;
}
export interface BatchPackageObjectsResponse {
  updated: PackageObjectDto[];
  created: PackageObjectDto[];
  deletedIds: Uuid[];
}
