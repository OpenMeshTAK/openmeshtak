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
  CreateMissionObjectRequest,
  MissionObjectDto,
  MissionObjectPage,
  UpdateMissionObjectRequest,
} from "./mission-object.dto.js";
import { createObject, deleteObject, getObject, listObjects, updateObject } from "./mission-objects.service.js";

/** Points, lines and polygons of a mission draft. Objects in locked layers cannot change. */
@Route("events/{eventId}/missions/{missionId}/objects")
@Tags("Missions")
@Security("sessionCookie")
@Security("serviceAccountBearer")
@Response<ProblemDetails>(401, "Authentication required")
@Response<ProblemDetails>(403, "Access denied")
@Response<ProblemDetails>(404, "Not found")
export class MissionObjectsController extends Controller {
  /**
   * Lists the mission's objects in creation order, optionally only those of one layer.
   * @isInt limit
   * @minimum limit 1
   * @maximum limit 100
   */
  @Get()
  @SuccessResponse(200, "Mission objects")
  @Middlewares(allowQueryParameters("limit", "cursor", "layerId"))
  @Response<ProblemDetails>(400, "Invalid cursor")
  public async listMissionObjects(
    @Request() request: unknown,
    @Path() eventId: Uuid,
    @Path() missionId: Uuid,
    @Query() layerId?: Uuid,
    @Query() limit?: number,
    @Query() cursor?: string,
  ): Promise<MissionObjectPage> {
    return listObjects(requestContext(request).principal, eventId, missionId, layerId, limit, cursor);
  }

  @Post()
  @SuccessResponse(201, "Mission object created")
  @Response<ProblemDetails>(409, "Layer locked, too many objects or event archived")
  @Response<ProblemDetails>(422, "Invalid geometry or other validation failure")
  public async createMissionObject(
    @Request() request: unknown,
    @Path() eventId: Uuid,
    @Path() missionId: Uuid,
    @Body() body: CreateMissionObjectRequest,
  ): Promise<MissionObjectDto> {
    const created = await createObject(requestContext(request), eventId, missionId, body);
    this.setStatus(201);
    return created;
  }

  @Get("{objectId}")
  @SuccessResponse(200, "Mission object")
  public async getMissionObject(
    @Request() request: unknown,
    @Path() eventId: Uuid,
    @Path() missionId: Uuid,
    @Path() objectId: Uuid,
  ): Promise<MissionObjectDto> {
    return getObject(requestContext(request).principal, eventId, missionId, objectId);
  }

  /** Replaces the object. Requires the current `version`. */
  @Put("{objectId}")
  @SuccessResponse(200, "Mission object updated")
  @Response<ProblemDetails>(409, "Version conflict, layer locked or event archived")
  @Response<ProblemDetails>(422, "Invalid geometry or other validation failure")
  public async updateMissionObject(
    @Request() request: unknown,
    @Path() eventId: Uuid,
    @Path() missionId: Uuid,
    @Path() objectId: Uuid,
    @Body() body: UpdateMissionObjectRequest,
  ): Promise<MissionObjectDto> {
    return updateObject(requestContext(request), eventId, missionId, objectId, body);
  }

  @Delete("{objectId}")
  @SuccessResponse(204, "Mission object deleted")
  @Response<ProblemDetails>(409, "Layer locked or event archived")
  public async deleteMissionObject(
    @Request() request: unknown,
    @Path() eventId: Uuid,
    @Path() missionId: Uuid,
    @Path() objectId: Uuid,
  ): Promise<void> {
    await deleteObject(requestContext(request), eventId, missionId, objectId);
    this.setStatus(204);
  }
}
