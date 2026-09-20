import {
  Body,
  Controller,
  Delete,
  Get,
  Middlewares,
  Path,
  Post,
  Put,
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
import type {
  CreateDataPackageRequest,
  DataPackageDto,
  DataPackagePage,
  UpdateDataPackageRequest,
  UpdatePackageAudienceRequest,
} from "./data-package.dto.js";
import { createDataPackage, deleteDataPackage, getDataPackage, listDataPackages, updateDataPackage } from "./data-packages.service.js";
import { updatePackageAudience } from "./package-audience.service.js";

/**
 * Data packages hold an event's editable map content. Reads need `data-packages.read`, changes
 * `data-packages.edit`; archived events are read-only.
 */
@Route("events/{eventId}/data-packages")
@Tags("Data packages")
@Security("sessionCookie")
@Security("serviceAccountBearer")
@Response<ProblemDetails>(401, "Authentication required")
@Response<ProblemDetails>(403, "Access denied")
@Response<ProblemDetails>(404, "Not found")
export class DataPackagesController extends Controller {
  /**
   * Lists the event's data packages ordered by creation time, oldest first.
   * @isInt limit
   * @minimum limit 1
   * @maximum limit 100
   */
  @Get()
  @SuccessResponse(200, "Data packages")
  @Middlewares(allowQueryParameters("limit", "cursor"))
  @Response<ProblemDetails>(400, "Invalid cursor")
  public async listDataPackages(
    @Request() request: unknown,
    @Path() eventId: Uuid,
    @Query() limit?: number,
    @Query() cursor?: string,
  ): Promise<DataPackagePage> {
    return listDataPackages(requestContext(request).principal, eventId, limit, cursor);
  }

  /** Creates a data package with one empty layer. */
  @Post()
  @SuccessResponse(201, "Data package created")
  @Response<ProblemDetails>(409, "Event archived")
  @Response<ProblemDetails>(422, "Validation failed")
  public async createDataPackage(
    @Request() request: unknown,
    @Path() eventId: Uuid,
    @Body() body: CreateDataPackageRequest,
  ): Promise<DataPackageDto> {
    const created = await createDataPackage(requestContext(request), eventId, body);
    this.setStatus(201);
    return created;
  }

  @Get("{packageId}")
  @SuccessResponse(200, "Data package")
  public async getDataPackage(
    @Request() request: unknown,
    @Path() eventId: Uuid,
    @Path() packageId: Uuid,
  ): Promise<DataPackageDto> {
    return getDataPackage(requestContext(request).principal, eventId, packageId);
  }

  /** Replaces name and description. Requires the current `version`. */
  @Put("{packageId}")
  @SuccessResponse(200, "Data package updated")
  @Response<ProblemDetails>(409, "Version conflict or event archived")
  @Response<ProblemDetails>(422, "Validation failed")
  public async updateDataPackage(
    @Request() request: unknown,
    @Path() eventId: Uuid,
    @Path() packageId: Uuid,
    @Body() body: UpdateDataPackageRequest,
  ): Promise<DataPackageDto> {
    return updateDataPackage(requestContext(request), eventId, packageId, body);
  }

  /** Deletes the data package with its layers, objects and published revisions. */
  @Delete("{packageId}")
  @SuccessResponse(204, "Data package deleted")
  @Response<ProblemDetails>(409, "Event archived")
  public async deleteDataPackage(
    @Request() request: unknown,
    @Path() eventId: Uuid,
    @Path() packageId: Uuid,
  ): Promise<void> {
    await deleteDataPackage(requestContext(request), eventId, packageId);
    this.setStatus(204);
  }

  /**
   * Sets who receives the package's published revisions: all members or selected groups, roles
   * and members. Requires `data-packages.publish` and the current `version`.
   */
  @Put("{packageId}/audience")
  @SuccessResponse(200, "Audience updated")
  @Response<ProblemDetails>(403, "Access denied")
  @Response<ProblemDetails>(409, "Version conflict or event archived")
  @Response<ProblemDetails>(422, "Validation failed")
  public async updateDataPackageAudience(
    @Request() request: unknown,
    @Path() eventId: Uuid,
    @Path() packageId: Uuid,
    @Body() body: UpdatePackageAudienceRequest,
  ): Promise<DataPackageDto> {
    return updatePackageAudience(requestContext(request), eventId, packageId, body);
  }
}
