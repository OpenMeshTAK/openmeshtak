import { Controller, Get, Middlewares, Path, Produces, Query, Request, Response, Route, Security, SuccessResponse, Tags } from "@tsoa/runtime";
import type { ProblemDetails } from "../../shared/errors/problem.js";
import { allowQueryParameters } from "../../shared/http/query-allowlist.js";
import { requestContext } from "../../shared/http/request-context.js";
import type { Uuid } from "../../shared/http/uuid.js";
import { exportDraftKml, exportRevisionKml, type KmlExport } from "./package-kml.service.js";

/** KML exports for GIS tools; TAK apps use the ATAK Data Package export instead. */
@Route("events/{eventId}/data-packages/{packageId}")
@Tags("Data packages")
@Security("sessionCookie")
@Security("apiClientBearer")
@Response<ProblemDetails>(401, "Authentication required")
@Response<ProblemDetails>(403, "Access denied")
@Response<ProblemDetails>(404, "Not found")
export class PackageKmlController extends Controller {
  private send(result: KmlExport): string {
    this.setHeader("Content-Type", "application/vnd.google-earth.kml+xml");
    this.setHeader("Content-Disposition", `attachment; filename="${result.fileName}"`);
    return result.kml;
  }

  /** Exports the current draft as KML; `layerId` limits it to one layer. Circles become polygons. */
  @Get("kml")
  @Middlewares(allowQueryParameters("layerId"))
  @Produces("application/vnd.google-earth.kml+xml")
  @SuccessResponse(200, "KML of the draft")
  public async exportPackageDraftKml(
    @Request() request: unknown,
    @Path() eventId: Uuid,
    @Path() packageId: Uuid,
    @Query() layerId?: Uuid,
  ): Promise<string> {
    return this.send(await exportDraftKml(requestContext(request).principal, eventId, packageId, layerId));
  }

  /**
   * Exports a published revision as KML; `layerId` limits it to one layer.
   * @isInt number
   * @minimum number 1
   */
  @Get("revisions/{number}/kml")
  @Middlewares(allowQueryParameters("layerId"))
  @Produces("application/vnd.google-earth.kml+xml")
  @SuccessResponse(200, "KML of the revision")
  public async exportPackageRevisionKml(
    @Request() request: unknown,
    @Path() eventId: Uuid,
    @Path() packageId: Uuid,
    @Path() number: number,
    @Query() layerId?: Uuid,
  ): Promise<string> {
    return this.send(await exportRevisionKml(requestContext(request).principal, eventId, packageId, number, layerId));
  }
}
