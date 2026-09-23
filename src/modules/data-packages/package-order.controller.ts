import { Body, Controller, Path, Put, Request, Response, Route, Security, SuccessResponse, Tags } from "tsoa";
import type { ProblemDetails } from "../../shared/errors/problem.js";
import { requestContext } from "../../shared/http/request-context.js";
import type { Uuid } from "../../shared/http/uuid.js";
import type { DataPackageDto } from "./data-package.dto.js";
import { reorderDataPackages, type ReorderDataPackagesRequest } from "./package-order.service.js";

/** Drawing order of an event's data packages. Requires `data-packages.edit`. */
@Route("events/{eventId}/data-package-order")
@Tags("Data packages")
@Security("sessionCookie")
@Security("serviceAccountBearer")
@Response<ProblemDetails>(401, "Authentication required")
@Response<ProblemDetails>(403, "Access denied")
@Response<ProblemDetails>(404, "Not found")
export class PackageOrderController extends Controller {
  /** Replaces the order with the complete list of package IDs, bottom first. */
  @Put()
  @SuccessResponse(200, "Data packages in their new order")
  @Response<ProblemDetails>(409, "Packages changed meanwhile or event archived")
  @Response<ProblemDetails>(422, "Validation failed")
  public async reorderDataPackages(
    @Request() request: unknown,
    @Path() eventId: Uuid,
    @Body() body: ReorderDataPackagesRequest,
  ): Promise<DataPackageDto[]> {
    return reorderDataPackages(requestContext(request), eventId, body);
  }
}
