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
  CreateMissionLayerRequest,
  MissionLayerDto,
  MissionLayerPage,
  UpdateMissionLayerRequest,
} from "./mission.dto.js";
import { createLayer, deleteLayer, listLayers, updateLayer } from "./mission-layers.service.js";

@Route("events/{eventId}/missions/{missionId}/layers")
@Tags("Missions")
@Security("sessionCookie")
@Security("serviceAccountBearer")
@Response<ProblemDetails>(401, "Authentication required")
@Response<ProblemDetails>(403, "Access denied")
@Response<ProblemDetails>(404, "Not found")
export class MissionLayersController extends Controller {
  /**
   * Lists the mission's layers in creation order; sort by `sortOrder` for display.
   * @isInt limit
   * @minimum limit 1
   * @maximum limit 100
   */
  @Get()
  @SuccessResponse(200, "Mission layers")
  @Middlewares(allowQueryParameters("limit", "cursor"))
  @Response<ProblemDetails>(400, "Invalid cursor")
  public async listMissionLayers(
    @Request() request: unknown,
    @Path() eventId: Uuid,
    @Path() missionId: Uuid,
    @Query() limit?: number,
    @Query() cursor?: string,
  ): Promise<MissionLayerPage> {
    return listLayers(requestContext(request).principal, eventId, missionId, limit, cursor);
  }

  /** Adds a layer on top of the existing ones. */
  @Post()
  @SuccessResponse(201, "Mission layer created")
  @Response<ProblemDetails>(409, "Too many layers or event archived")
  @Response<ProblemDetails>(422, "Validation failed")
  public async createMissionLayer(
    @Request() request: unknown,
    @Path() eventId: Uuid,
    @Path() missionId: Uuid,
    @Body() body: CreateMissionLayerRequest,
  ): Promise<MissionLayerDto> {
    const created = await createLayer(requestContext(request), eventId, missionId, body);
    this.setStatus(201);
    return created;
  }

  /** Replaces name, order, visibility and lock state. Requires the current `version`. */
  @Put("{layerId}")
  @SuccessResponse(200, "Mission layer updated")
  @Response<ProblemDetails>(409, "Version conflict or event archived")
  @Response<ProblemDetails>(422, "Validation failed")
  public async updateMissionLayer(
    @Request() request: unknown,
    @Path() eventId: Uuid,
    @Path() missionId: Uuid,
    @Path() layerId: Uuid,
    @Body() body: UpdateMissionLayerRequest,
  ): Promise<MissionLayerDto> {
    return updateLayer(requestContext(request), eventId, missionId, layerId, body);
  }

  /** Deletes the layer and all of its objects. */
  @Delete("{layerId}")
  @SuccessResponse(204, "Mission layer deleted")
  @Response<ProblemDetails>(409, "Event archived")
  public async deleteMissionLayer(
    @Request() request: unknown,
    @Path() eventId: Uuid,
    @Path() missionId: Uuid,
    @Path() layerId: Uuid,
  ): Promise<void> {
    await deleteLayer(requestContext(request), eventId, missionId, layerId);
    this.setStatus(204);
  }
}
