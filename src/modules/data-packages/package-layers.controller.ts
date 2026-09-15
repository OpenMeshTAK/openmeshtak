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
  CreatePackageLayerRequest,
  PackageLayerDto,
  PackageLayerPage,
  UpdatePackageLayerRequest,
} from "./data-package.dto.js";
import { createLayer, deleteLayer, listLayers, updateLayer } from "./package-layers.service.js";

@Route("events/{eventId}/data-packages/{packageId}/layers")
@Tags("Data packages")
@Security("sessionCookie")
@Security("serviceAccountBearer")
@Response<ProblemDetails>(401, "Authentication required")
@Response<ProblemDetails>(403, "Access denied")
@Response<ProblemDetails>(404, "Not found")
export class PackageLayersController extends Controller {
  /**
   * Lists the data package's layers in creation order; sort by `sortOrder` for display.
   * @isInt limit
   * @minimum limit 1
   * @maximum limit 100
   */
  @Get()
  @SuccessResponse(200, "Package layers")
  @Middlewares(allowQueryParameters("limit", "cursor"))
  @Response<ProblemDetails>(400, "Invalid cursor")
  public async listPackageLayers(
    @Request() request: unknown,
    @Path() eventId: Uuid,
    @Path() packageId: Uuid,
    @Query() limit?: number,
    @Query() cursor?: string,
  ): Promise<PackageLayerPage> {
    return listLayers(requestContext(request).principal, eventId, packageId, limit, cursor);
  }

  /** Adds a layer on top of the existing ones. */
  @Post()
  @SuccessResponse(201, "Package layer created")
  @Response<ProblemDetails>(409, "Too many layers or event archived")
  @Response<ProblemDetails>(422, "Validation failed")
  public async createPackageLayer(
    @Request() request: unknown,
    @Path() eventId: Uuid,
    @Path() packageId: Uuid,
    @Body() body: CreatePackageLayerRequest,
  ): Promise<PackageLayerDto> {
    const created = await createLayer(requestContext(request), eventId, packageId, body);
    this.setStatus(201);
    return created;
  }

  /** Replaces name, order, visibility and lock state. Requires the current `version`. */
  @Put("{layerId}")
  @SuccessResponse(200, "Package layer updated")
  @Response<ProblemDetails>(409, "Version conflict or event archived")
  @Response<ProblemDetails>(422, "Validation failed")
  public async updatePackageLayer(
    @Request() request: unknown,
    @Path() eventId: Uuid,
    @Path() packageId: Uuid,
    @Path() layerId: Uuid,
    @Body() body: UpdatePackageLayerRequest,
  ): Promise<PackageLayerDto> {
    return updateLayer(requestContext(request), eventId, packageId, layerId, body);
  }

  /** Deletes the layer and all of its objects. */
  @Delete("{layerId}")
  @SuccessResponse(204, "Package layer deleted")
  @Response<ProblemDetails>(409, "Event archived")
  public async deletePackageLayer(
    @Request() request: unknown,
    @Path() eventId: Uuid,
    @Path() packageId: Uuid,
    @Path() layerId: Uuid,
  ): Promise<void> {
    await deleteLayer(requestContext(request), eventId, packageId, layerId);
    this.setStatus(204);
  }
}
