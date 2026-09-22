import { Readable } from "node:stream";
import {
  Controller,
  Get,
  Middlewares,
  Path,
  Post,
  Produces,
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
import { rawUpload, uploadedBytes } from "./atak/raw-upload.js";
import { exportAtak, importAtak } from "./package-atak.service.js";
import type { ImportReport } from "./package-import.dto.js";

/** ATAK Data Package import into a draft layer and export of published revisions. */
@Route("events/{eventId}/data-packages/{packageId}")
@Tags("Data packages")
@Security("sessionCookie")
@Security("serviceAccountBearer")
@Response<ProblemDetails>(401, "Authentication required")
@Response<ProblemDetails>(403, "Access denied")
@Response<ProblemDetails>(404, "Not found")
export class PackageAtakController extends Controller {
  /**
   * Imports an ATAK Data Package (`application/zip`, at most 10 MB) or a single CoT event
   * (`application/xml`) into the layer. Markers, freeform shapes, rectangles and circles are
   * supported; the report lists every adjusted, skipped and rejected item.
   */
  @Post("layers/{layerId}/import/atak")
  @Middlewares(rawUpload)
  @SuccessResponse(200, "Import report")
  @Response<ProblemDetails>(409, "Layer locked, too many objects or event archived")
  @Response<ProblemDetails>(413, "Upload too large")
  @Response<ProblemDetails>(415, "Unsupported upload")
  @Response<ProblemDetails>(422, "Unreadable archive")
  public async importAtakDataPackage(
    @Request() request: unknown,
    @Path() eventId: Uuid,
    @Path() packageId: Uuid,
    @Path() layerId: Uuid,
  ): Promise<ImportReport> {
    return importAtak(requestContext(request), eventId, packageId, layerId, uploadedBytes(request));
  }

  /**
   * Downloads a published revision as an ATAK Data Package (ZIP with `MANIFEST/manifest.xml`).
   * `layerId` exports only that layer, as its own package.
   * @isInt number
   * @minimum number 1
   */
  @Get("revisions/{number}/atak")
  @Middlewares(allowQueryParameters("layerId"))
  @Produces("application/zip")
  @SuccessResponse(200, "ATAK Data Package")
  public async exportAtakDataPackage(
    @Request() request: unknown,
    @Path() eventId: Uuid,
    @Path() packageId: Uuid,
    @Path() number: number,
    @Query() layerId?: Uuid,
  ): Promise<Readable> {
    const { fileName, bytes } = await exportAtak(requestContext(request).principal, eventId, packageId, number, layerId);
    this.setHeader("Content-Type", "application/zip");
    this.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
    return Readable.from([Buffer.from(bytes)]);
  }
}
