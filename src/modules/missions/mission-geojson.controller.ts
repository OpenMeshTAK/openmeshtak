import {
  Body,
  Controller,
  Get,
  Path,
  Post,
  Request,
  Response,
  Route,
  Security,
  SuccessResponse,
  Tags,
} from "tsoa";
import type { ProblemDetails } from "../../shared/errors/problem.js";
import { requestContext } from "../../shared/http/request-context.js";
import type { Uuid } from "../../shared/http/uuid.js";
import type { GeoJsonDocument, GeoJsonFeatureCollection, GeoJsonImportReport } from "./mission-import.dto.js";
import { exportDraftGeoJson, exportRevisionGeoJson, importGeoJson } from "./mission-import.service.js";

/** GeoJSON import into a draft layer and export of drafts or published revisions. */
@Route("events/{eventId}/missions/{missionId}")
@Tags("Missions")
@Security("sessionCookie")
@Security("serviceAccountBearer")
@Response<ProblemDetails>(401, "Authentication required")
@Response<ProblemDetails>(403, "Access denied")
@Response<ProblemDetails>(404, "Not found")
export class MissionGeoJsonController extends Controller {
  /**
   * Imports a GeoJSON FeatureCollection, Feature or geometry into the layer. Points, lines and
   * polygons are supported; multi-geometries are split. The report lists every adjustment, every
   * skipped and every rejected feature. Request bodies are limited to 1 MB.
   */
  @Post("layers/{layerId}/import")
  @SuccessResponse(200, "Import report")
  @Response<ProblemDetails>(409, "Layer locked, too many objects or event archived")
  public async importMissionGeoJson(
    @Request() request: unknown,
    @Path() eventId: Uuid,
    @Path() missionId: Uuid,
    @Path() layerId: Uuid,
    @Body() body: GeoJsonDocument,
  ): Promise<GeoJsonImportReport> {
    return importGeoJson(requestContext(request), eventId, missionId, layerId, body);
  }

  /** Exports the current draft as a GeoJSON FeatureCollection with simplestyle properties. */
  @Get("geojson")
  @SuccessResponse(200, "GeoJSON of the draft")
  public async exportMissionDraftGeoJson(
    @Request() request: unknown,
    @Path() eventId: Uuid,
    @Path() missionId: Uuid,
  ): Promise<GeoJsonFeatureCollection> {
    return exportDraftGeoJson(requestContext(request).principal, eventId, missionId);
  }

  /**
   * Exports a published revision as a GeoJSON FeatureCollection.
   * @isInt number
   * @minimum number 1
   */
  @Get("revisions/{number}/geojson")
  @SuccessResponse(200, "GeoJSON of the revision")
  public async exportMissionRevisionGeoJson(
    @Request() request: unknown,
    @Path() eventId: Uuid,
    @Path() missionId: Uuid,
    @Path() number: number,
  ): Promise<GeoJsonFeatureCollection> {
    return exportRevisionGeoJson(requestContext(request).principal, eventId, missionId, number);
  }
}
