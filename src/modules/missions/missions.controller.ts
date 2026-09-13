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
import type { CreateMissionRequest, MissionDto, MissionPage, UpdateMissionRequest } from "./mission.dto.js";
import { createMission, deleteMission, getMission, listMissions, updateMission } from "./missions.service.js";

/**
 * Missions hold an event's editable map content. Reads need `missions.read`, changes
 * `missions.edit`; archived events are read-only.
 */
@Route("events/{eventId}/missions")
@Tags("Missions")
@Security("sessionCookie")
@Security("serviceAccountBearer")
@Response<ProblemDetails>(401, "Authentication required")
@Response<ProblemDetails>(403, "Access denied")
@Response<ProblemDetails>(404, "Not found")
export class MissionsController extends Controller {
  /**
   * Lists the event's missions ordered by creation time, oldest first.
   * @isInt limit
   * @minimum limit 1
   * @maximum limit 100
   */
  @Get()
  @SuccessResponse(200, "Missions")
  @Middlewares(allowQueryParameters("limit", "cursor"))
  @Response<ProblemDetails>(400, "Invalid cursor")
  public async listMissions(
    @Request() request: unknown,
    @Path() eventId: Uuid,
    @Query() limit?: number,
    @Query() cursor?: string,
  ): Promise<MissionPage> {
    return listMissions(requestContext(request).principal, eventId, limit, cursor);
  }

  /** Creates a mission with one empty layer. */
  @Post()
  @SuccessResponse(201, "Mission created")
  @Response<ProblemDetails>(409, "Event archived")
  @Response<ProblemDetails>(422, "Validation failed")
  public async createMission(
    @Request() request: unknown,
    @Path() eventId: Uuid,
    @Body() body: CreateMissionRequest,
  ): Promise<MissionDto> {
    const created = await createMission(requestContext(request), eventId, body);
    this.setStatus(201);
    return created;
  }

  @Get("{missionId}")
  @SuccessResponse(200, "Mission")
  public async getMission(
    @Request() request: unknown,
    @Path() eventId: Uuid,
    @Path() missionId: Uuid,
  ): Promise<MissionDto> {
    return getMission(requestContext(request).principal, eventId, missionId);
  }

  /** Replaces name and description. Requires the current `version`. */
  @Put("{missionId}")
  @SuccessResponse(200, "Mission updated")
  @Response<ProblemDetails>(409, "Version conflict or event archived")
  @Response<ProblemDetails>(422, "Validation failed")
  public async updateMission(
    @Request() request: unknown,
    @Path() eventId: Uuid,
    @Path() missionId: Uuid,
    @Body() body: UpdateMissionRequest,
  ): Promise<MissionDto> {
    return updateMission(requestContext(request), eventId, missionId, body);
  }

  /** Deletes the mission with its layers, objects and published revisions. */
  @Delete("{missionId}")
  @SuccessResponse(204, "Mission deleted")
  @Response<ProblemDetails>(409, "Event archived")
  public async deleteMission(
    @Request() request: unknown,
    @Path() eventId: Uuid,
    @Path() missionId: Uuid,
  ): Promise<void> {
    await deleteMission(requestContext(request), eventId, missionId);
    this.setStatus(204);
  }
}
