import { Readable } from "node:stream";
import express from "express";
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
import { ProblemError } from "../../shared/errors/problem-error.js";
import type { ProblemDetails } from "../../shared/errors/problem.js";
import { allowQueryParameters } from "../../shared/http/query-allowlist.js";
import { requestContext } from "../../shared/http/request-context.js";
import type { Uuid } from "../../shared/http/uuid.js";
import { MAX_UPLOAD_BYTES } from "./atak/data-package-archive.js";
import { exportAtak, importAtak } from "./package-atak.service.js";
import type { ImportReport } from "./package-import.dto.js";

/** Uploads arrive as raw bytes (ZIP or CoT XML); JSON bodies are parsed elsewhere and rejected. */
const rawUpload = express.raw({ type: ["application/zip", "application/octet-stream", "application/xml", "text/xml"], limit: MAX_UPLOAD_BYTES });

function uploadedBytes(request: unknown): Uint8Array {
  const body = (request as { body?: unknown }).body;
  if (!Buffer.isBuffer(body) || body.length === 0) {
    throw new ProblemError({
      type: "urn:openmeshtak:problem:unsupported-media-type",
      title: "Unsupported upload",
      status: 415,
      detail: "Send the Data Package as application/zip or a CoT file as application/xml.",
      code: "UNSUPPORTED_MEDIA_TYPE",
    });
  }
  return new Uint8Array(body);
}

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
