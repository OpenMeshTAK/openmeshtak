import { Body, Controller, Path, Post, Request, Response, Route, Security, SuccessResponse, Tags } from "@tsoa/runtime";
import type { ProblemDetails } from "../../shared/errors/problem.js";
import { requestContext } from "../../shared/http/request-context.js";
import type { Uuid } from "../../shared/http/uuid.js";
import type { DataPackageDto } from "./data-package.dto.js";
import type { CreateDataPackageCopyRequest } from "./package-copy.dto.js";
import { createDataPackageCopy } from "./package-copy.service.js";

/** Creates an editable Data Package from published revisions of packages in the same event. */
@Route("events/{eventId}/data-package-copies")
@Tags("Data packages")
@Security("sessionCookie")
@Security("apiClientBearer")
@Response<ProblemDetails>(401, "Authentication required")
@Response<ProblemDetails>(403, "Access denied")
@Response<ProblemDetails>(404, "Not found")
@Response<ProblemDetails>(409, "Event archived, nothing published or package limits exceeded")
@Response<ProblemDetails>(422, "Validation failed")
export class PackageCopyController extends Controller {
  /** Copies selected published layers with new UUIDs and records their source revisions. */
  @Post()
  @SuccessResponse(201, "Data package draft created")
  public async createDataPackageCopy(
    @Request() request: unknown,
    @Path() eventId: Uuid,
    @Body() body: CreateDataPackageCopyRequest,
  ): Promise<DataPackageDto> {
    const created = await createDataPackageCopy(requestContext(request), eventId, body);
    this.setStatus(201);
    return created;
  }
}
