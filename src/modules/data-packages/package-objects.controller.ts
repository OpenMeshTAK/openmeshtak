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
  CreatePackageObjectRequest,
  PackageObjectDto,
  PackageObjectPage,
  UpdatePackageObjectRequest,
} from "./package-object.dto.js";
import { createObject, deleteObject, getObject, listObjects, updateObject } from "./package-objects.service.js";

/** Editable geometry of a data package draft. Objects in locked layers cannot change. */
@Route("events/{eventId}/data-packages/{packageId}/objects")
@Tags("Data packages")
@Security("sessionCookie")
@Security("apiClientBearer")
@Response<ProblemDetails>(401, "Authentication required")
@Response<ProblemDetails>(403, "Access denied")
@Response<ProblemDetails>(404, "Not found")
export class PackageObjectsController extends Controller {
  /**
   * Lists the data package's objects in creation order, optionally only those of one layer.
   * @isInt limit
   * @minimum limit 1
   * @maximum limit 100
   */
  @Get()
  @SuccessResponse(200, "Package objects")
  @Middlewares(allowQueryParameters("limit", "cursor", "layerId"))
  @Response<ProblemDetails>(400, "Invalid cursor")
  public async listPackageObjects(
    @Request() request: unknown,
    @Path() eventId: Uuid,
    @Path() packageId: Uuid,
    @Query() layerId?: Uuid,
    @Query() limit?: number,
    @Query() cursor?: string,
  ): Promise<PackageObjectPage> {
    return listObjects(requestContext(request).principal, eventId, packageId, layerId, limit, cursor);
  }

  /**
   * @param _idempotencyKey Makes retries safe: a repeated request returns the original response.
   */
  @Post()
  @Middlewares(idempotent)
  @SuccessResponse(201, "Package object created")
  @Response<ProblemDetails>(409, "Layer locked, too many objects or event archived; Idempotency-Key conflict")
  @Response<ProblemDetails>(422, "Invalid geometry or other validation failure")
  public async createPackageObject(
    @Request() request: unknown,
    @Path() eventId: Uuid,
    @Path() packageId: Uuid,
    @Body() body: CreatePackageObjectRequest,
    @Header("Idempotency-Key") _idempotencyKey?: string,
  ): Promise<PackageObjectDto> {
    const created = await createObject(requestContext(request), eventId, packageId, body);
    this.setStatus(201);
    return created;
  }

  @Get("{objectId}")
  @SuccessResponse(200, "Package object")
  public async getPackageObject(
    @Request() request: unknown,
    @Path() eventId: Uuid,
    @Path() packageId: Uuid,
    @Path() objectId: Uuid,
  ): Promise<PackageObjectDto> {
    return getObject(requestContext(request).principal, eventId, packageId, objectId);
  }

  /** Replaces the object. Requires the current `version`. */
  @Put("{objectId}")
  @SuccessResponse(200, "Package object updated")
  @Response<ProblemDetails>(409, "Version conflict, layer locked or event archived")
  @Response<ProblemDetails>(422, "Invalid geometry or other validation failure")
  public async updatePackageObject(
    @Request() request: unknown,
    @Path() eventId: Uuid,
    @Path() packageId: Uuid,
    @Path() objectId: Uuid,
    @Body() body: UpdatePackageObjectRequest,
  ): Promise<PackageObjectDto> {
    return updateObject(requestContext(request), eventId, packageId, objectId, body);
  }

  @Delete("{objectId}")
  @SuccessResponse(204, "Package object deleted")
  @Response<ProblemDetails>(409, "Layer locked or event archived")
  public async deletePackageObject(
    @Request() request: unknown,
    @Path() eventId: Uuid,
    @Path() packageId: Uuid,
    @Path() objectId: Uuid,
  ): Promise<void> {
    await deleteObject(requestContext(request), eventId, packageId, objectId);
    this.setStatus(204);
  }
}
