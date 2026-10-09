import {
  Body,
  Controller,
  Delete,
  Get,
  Header,
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
} from "@tsoa/runtime";
import type { ProblemDetails } from "../../shared/errors/problem.js";
import { idempotent } from "../../shared/http/idempotency.js";
import { allowQueryParameters } from "../../shared/http/query-allowlist.js";
import { requestContext } from "../../shared/http/request-context.js";
import type { Uuid } from "../../shared/http/uuid.js";
import type {
  CreateDataPackageRequest,
  DataPackageDto,
  DataPackageKind,
  DataPackagePage,
  UpdateDataPackageRequest,
  UpdatePackageWritersRequest,
  UpdatePackageAudienceRequest,
  UpdatePackageTakDeliveryRequest,
} from "./data-package.dto.js";
import { createDataPackage, deleteDataPackage, getDataPackage, listDataPackages, updateDataPackage } from "./data-packages.service.js";
import { updateMissionWriters, updatePackageAudience, updatePackageTakDelivery } from "./package-audience.service.js";

/**
 * Data packages hold an event's editable map content. Reads need `data-packages.read`, changes
 * `data-packages.edit`; archived events are read-only.
 */
@Route("events/{eventId}/data-packages")
@Tags("Data packages")
@Security("sessionCookie")
@Security("apiClientBearer")
@Response<ProblemDetails>(401, "Authentication required")
@Response<ProblemDetails>(403, "Access denied")
@Response<ProblemDetails>(404, "Not found")
export class DataPackagesController extends Controller {
  /**
   * Lists the event's data packages and missions ordered by creation time, oldest first; `kind`
   * limits the list to one kind.
   * @isInt limit
   * @minimum limit 1
   * @maximum limit 100
   */
  @Get()
  @SuccessResponse(200, "Data packages")
  @Middlewares(allowQueryParameters("limit", "cursor", "kind"))
  @Response<ProblemDetails>(400, "Invalid cursor")
  public async listDataPackages(
    @Request() request: unknown,
    @Path() eventId: Uuid,
    @Query() limit?: number,
    @Query() cursor?: string,
    @Query() kind?: DataPackageKind,
  ): Promise<DataPackagePage> {
    return listDataPackages(requestContext(request).principal, eventId, limit, cursor, kind);
  }

  /**
   * Creates a data package with one empty layer.
   * @param _idempotencyKey Makes retries safe: a repeated request returns the original response.
   */
  @Post()
  @Middlewares(idempotent)
  @SuccessResponse(201, "Data package created")
  @Response<ProblemDetails>(409, "Event archived; Idempotency-Key conflict")
  @Response<ProblemDetails>(422, "Validation failed")
  public async createDataPackage(
    @Request() request: unknown,
    @Path() eventId: Uuid,
    @Body() body: CreateDataPackageRequest,
    @Header("Idempotency-Key") _idempotencyKey?: string,
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

  /**
   * Missions only: sets the groups, roles and members that may change the mission from a TAK app.
   * Requires `data-packages.publish` and the current `version`.
   */
  @Put("{packageId}/writers")
  @SuccessResponse(200, "Writers updated")
  @Response<ProblemDetails>(409, "Version conflict, not a mission or event archived")
  @Response<ProblemDetails>(422, "Validation failed")
  public async updateMissionWriters(
    @Request() request: unknown,
    @Path() eventId: Uuid,
    @Path() packageId: Uuid,
    @Body() body: UpdatePackageWritersRequest,
  ): Promise<DataPackageDto> {
    return updateMissionWriters(requestContext(request), eventId, packageId, body);
  }

  /**
   * Chooses whether the built-in TAK server installs the package by itself on enrollment and/or
   * on every connection. Requires `data-packages.publish` and the current `version`.
   */
  @Put("{packageId}/tak-delivery")
  @SuccessResponse(200, "TAK delivery updated")
  @Response<ProblemDetails>(403, "Access denied")
  @Response<ProblemDetails>(409, "Version conflict or event archived")
  public async updateDataPackageTakDelivery(
    @Request() request: unknown,
    @Path() eventId: Uuid,
    @Path() packageId: Uuid,
    @Body() body: UpdatePackageTakDeliveryRequest,
  ): Promise<DataPackageDto> {
    return updatePackageTakDelivery(requestContext(request), eventId, packageId, body);
  }
}
