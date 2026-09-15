import {
  Controller,
  Get,
  Middlewares,
  Path,
  Post,
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
import type { MissionRevisionDto, MissionRevisionPage, PublishMissionResponse } from "./mission-revision.dto.js";
import { getRevision, listRevisions, publishMission } from "./mission-revisions.service.js";

/** Immutable published mission states. Packages reference a revision, never the draft. */
@Route("events/{eventId}/missions/{missionId}/revisions")
@Tags("Missions")
@Security("sessionCookie")
@Security("serviceAccountBearer")
@Response<ProblemDetails>(401, "Authentication required")
@Response<ProblemDetails>(403, "Access denied")
@Response<ProblemDetails>(404, "Not found")
export class MissionRevisionsController extends Controller {
  /**
   * Lists published revisions, oldest first, without their snapshots.
   * @isInt limit
   * @minimum limit 1
   * @maximum limit 100
   */
  @Get()
  @SuccessResponse(200, "Mission revisions")
  @Middlewares(allowQueryParameters("limit", "cursor"))
  @Response<ProblemDetails>(400, "Invalid cursor")
  public async listMissionRevisions(
    @Request() request: unknown,
    @Path() eventId: Uuid,
    @Path() missionId: Uuid,
    @Query() limit?: number,
    @Query() cursor?: string,
  ): Promise<MissionRevisionPage> {
    return listRevisions(requestContext(request).principal, eventId, missionId, limit, cursor);
  }

  /** Publishes the current draft. Requires `missions.publish`. */
  @Post()
  @SuccessResponse(200, "Published, or the unchanged latest revision")
  @Response<ProblemDetails>(409, "Event archived")
  public async publishMission(
    @Request() request: unknown,
    @Path() eventId: Uuid,
    @Path() missionId: Uuid,
  ): Promise<PublishMissionResponse> {
    return publishMission(requestContext(request), eventId, missionId);
  }

  /**
   * Returns one revision with its snapshot.
   * @isInt number
   * @minimum number 1
   */
  @Get("{number}")
  @SuccessResponse(200, "Mission revision")
  public async getMissionRevision(
    @Request() request: unknown,
    @Path() eventId: Uuid,
    @Path() missionId: Uuid,
    @Path() number: number,
  ): Promise<MissionRevisionDto> {
    return getRevision(requestContext(request).principal, eventId, missionId, number);
  }
}
