import {
  Body,
  Controller,
  Get,
  Middlewares,
  Path,
  Post,
  Query,
  Request,
  Response,
  Route,
  Security,
  SuccessResponse,
  Tags,
} from "tsoa";
import type { ProblemDetails } from "../../shared/errors/problem.js";
import { allowQueryParameters } from "../../shared/http/query-allowlist.js";
import { requestContext } from "../../shared/http/request-context.js";
import type { Uuid } from "../../shared/http/uuid.js";
import type { GeoJsonDocument, GeoJsonFeatureCollection, ImportReport } from "./package-import.dto.js";
import { exportDraftGeoJson, exportRevisionGeoJson, importGeoJson } from "./package-import.service.js";

/** GeoJSON import into a draft layer and export of drafts or published revisions. */
@Route("events/{eventId}/data-packages/{packageId}")
@Tags("Data packages")
@Security("sessionCookie")
@Security("apiClientBearer")
@Response<ProblemDetails>(401, "Authentication required")
@Response<ProblemDetails>(403, "Access denied")
@Response<ProblemDetails>(404, "Not found")
export class PackageGeoJsonController extends Controller {
  /**
   * Imports a GeoJSON FeatureCollection, Feature or geometry into the layer. Points, lines and
   * polygons are supported; multi-geometries are split. The report lists every adjustment, every
   * skipped and every rejected feature. Request bodies are limited to 1 MB.
   */
  @Post("layers/{layerId}/import")
  @SuccessResponse(200, "Import report")
  @Response<ProblemDetails>(409, "Layer locked, too many objects or event archived")
  public async importPackageGeoJson(
    @Request() request: unknown,
    @Path() eventId: Uuid,
    @Path() packageId: Uuid,
    @Path() layerId: Uuid,
    @Body() body: GeoJsonDocument,
  ): Promise<ImportReport> {
    return importGeoJson(requestContext(request), eventId, packageId, layerId, body);
  }

  /**
   * Exports the current draft as a GeoJSON FeatureCollection with simplestyle properties.
   * `layerId` limits the export to one layer.
   */
  @Get("geojson")
  @Middlewares(allowQueryParameters("layerId"))
  @SuccessResponse(200, "GeoJSON of the draft")
  public async exportPackageDraftGeoJson(
    @Request() request: unknown,
    @Path() eventId: Uuid,
    @Path() packageId: Uuid,
    @Query() layerId?: Uuid,
  ): Promise<GeoJsonFeatureCollection> {
    return exportDraftGeoJson(requestContext(request).principal, eventId, packageId, layerId);
  }

  /**
   * Exports a published revision as a GeoJSON FeatureCollection; `layerId` limits it to one layer.
   * @isInt number
   * @minimum number 1
   */
  @Get("revisions/{number}/geojson")
  @Middlewares(allowQueryParameters("layerId"))
  @SuccessResponse(200, "GeoJSON of the revision")
  public async exportPackageRevisionGeoJson(
    @Request() request: unknown,
    @Path() eventId: Uuid,
    @Path() packageId: Uuid,
    @Path() number: number,
    @Query() layerId?: Uuid,
  ): Promise<GeoJsonFeatureCollection> {
    return exportRevisionGeoJson(requestContext(request).principal, eventId, packageId, number, layerId);
  }
}
