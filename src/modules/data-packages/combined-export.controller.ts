import { Readable } from "node:stream";
import { Body, Controller, Path, Post, Produces, Request, Response, Route, Security, SuccessResponse, Tags } from "tsoa";
import type { ProblemDetails } from "../../shared/errors/problem.js";
import { requestContext } from "../../shared/http/request-context.js";
import type { Uuid } from "../../shared/http/uuid.js";
import type { CombinedExportReport, CombinedExportRequest } from "./combined-export.dto.js";
import { exportCombined, previewCombinedExport } from "./combined-export.service.js";

/**
 * Several Data Packages of an event, or chosen layers of them, as one ATAK Data Package built from
 * published revisions. Requires `data-packages.read`.
 */
@Route("events/{eventId}/data-package-exports/atak")
@Tags("Data packages")
@Security("sessionCookie")
@Security("serviceAccountBearer")
@Response<ProblemDetails>(401, "Authentication required")
@Response<ProblemDetails>(403, "Access denied")
@Response<ProblemDetails>(404, "Not found")
@Response<ProblemDetails>(422, "Validation failed")
export class CombinedExportController extends Controller {
  /** Reports which packages and revisions an export would include, skip or name twice. */
  @Post("preview")
  @SuccessResponse(200, "Export report")
  public async previewCombinedExport(
    @Request() request: unknown,
    @Path() eventId: Uuid,
    @Body() body: CombinedExportRequest,
  ): Promise<CombinedExportReport> {
    return previewCombinedExport(requestContext(request).principal, eventId, body);
  }

  /** Builds the combined ATAK Data Package. Audited with the exported revisions. */
  @Post()
  @Produces("application/zip")
  @SuccessResponse(200, "ATAK Data Package")
  @Response<ProblemDetails>(409, "Nothing published to export")
  public async exportCombinedDataPackage(
    @Request() request: unknown,
    @Path() eventId: Uuid,
    @Body() body: CombinedExportRequest,
  ): Promise<Readable> {
    const { fileName, bytes } = await exportCombined(requestContext(request), eventId, body);
    this.setHeader("Content-Type", "application/zip");
    this.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
    return Readable.from([Buffer.from(bytes)]);
  }
}
