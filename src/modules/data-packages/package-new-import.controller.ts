import { Controller, Middlewares, Path, Post, Query, Request, Response, Route, Security, SuccessResponse, Tags } from "tsoa";
import type { ProblemDetails } from "../../shared/errors/problem.js";
import { allowQueryParameters } from "../../shared/http/query-allowlist.js";
import { requestContext } from "../../shared/http/request-context.js";
import type { Uuid } from "../../shared/http/uuid.js";
import { rawUpload, uploadedBytes } from "./atak/raw-upload.js";
import { importAtakAsNewPackage, type ImportedDataPackage } from "./package-atak.service.js";

/** Creates data packages from uploaded ATAK Data Packages. Requires `data-packages.edit`. */
@Route("events/{eventId}/data-package-imports/atak")
@Tags("Data packages")
@Security("sessionCookie")
@Security("apiClientBearer")
@Response<ProblemDetails>(401, "Authentication required")
@Response<ProblemDetails>(403, "Access denied")
@Response<ProblemDetails>(404, "Not found")
export class PackageNewImportController extends Controller {
  /**
   * Creates a data package from an ATAK Data Package (`application/zip`) or a CoT file
   * (`application/xml`) and imports it into the first layer. The name comes from the package
   * manifest, otherwise from `fileName`. A failed import leaves no package behind.
   * @maxLength fileName 255
   */
  @Post()
  @Middlewares(rawUpload, allowQueryParameters("fileName"))
  @SuccessResponse(201, "Data package created")
  @Response<ProblemDetails>(409, "Too many objects or event archived")
  @Response<ProblemDetails>(413, "Upload too large")
  @Response<ProblemDetails>(415, "Unsupported upload")
  @Response<ProblemDetails>(422, "Unreadable archive")
  public async importAtakAsNewPackage(
    @Request() request: unknown,
    @Path() eventId: Uuid,
    @Query() fileName?: string,
  ): Promise<ImportedDataPackage> {
    const imported = await importAtakAsNewPackage(requestContext(request), eventId, uploadedBytes(request), fileName);
    this.setStatus(201);
    return imported;
  }
}
