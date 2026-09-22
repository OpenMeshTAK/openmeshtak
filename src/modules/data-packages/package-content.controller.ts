import { Readable } from "node:stream";
import { Controller, Get, Path, Produces, Request, Response, Route, Security, SuccessResponse, Tags } from "tsoa";
import type { ProblemDetails } from "../../shared/errors/problem.js";
import { requestContext } from "../../shared/http/request-context.js";
import type { Uuid } from "../../shared/http/uuid.js";
import type { PackageContentDto } from "./package-content.dto.js";
import { listPackageContents, rubberSheetImageOf } from "./package-content.service.js";

/** ATAK map content of a data package's draft. Requires `data-packages.read`. */
@Route("events/{eventId}/data-packages/{packageId}/contents")
@Tags("Data packages")
@Security("sessionCookie")
@Security("serviceAccountBearer")
@Response<ProblemDetails>(401, "Authentication required")
@Response<ProblemDetails>(403, "Access denied")
@Response<ProblemDetails>(404, "Not found")
export class PackageContentController extends Controller {
  /** Offline maps, nested map packages and rubber sheets kept from imports. */
  @Get()
  @SuccessResponse(200, "Map content")
  public async listPackageContents(
    @Request() request: unknown,
    @Path() eventId: Uuid,
    @Path() packageId: Uuid,
  ): Promise<PackageContentDto[]> {
    return listPackageContents(requestContext(request).principal, eventId, packageId);
  }

  /** The image of a rubber sheet for display on the map. */
  @Get("{contentId}/image")
  @Produces("image/png")
  @SuccessResponse(200, "Rubber-sheet image")
  public async getRubberSheetImage(
    @Request() request: unknown,
    @Path() eventId: Uuid,
    @Path() packageId: Uuid,
    @Path() contentId: Uuid,
  ): Promise<Readable> {
    const { bytes, mediaType } = await rubberSheetImageOf(requestContext(request).principal, eventId, packageId, contentId);
    this.setHeader("Content-Type", mediaType);
    return Readable.from([Buffer.from(bytes)]);
  }
}
