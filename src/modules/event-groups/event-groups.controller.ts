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
  CreateEventGroupRequest,
  EventGroupDto,
  EventGroupPage,
  UpdateEventGroupRequest,
} from "./event-group.dto.js";
import {
  createEventGroup,
  deleteEventGroup,
  getEventGroup,
  listEventGroups,
  updateEventGroup,
} from "./event-groups.service.js";

/**
 * Event groups are tactical/provisioning units such as `Bravo`. Every member has exactly one
 * group. They drive callsigns and provisioning but never grant permissions; reads need
 * `events.read` and changes `events.manage`.
 */
@Route("events/{eventId}/groups")
@Tags("Event groups")
@Security("sessionCookie")
@Security("serviceAccountBearer")
@Response<ProblemDetails>(401, "Authentication required")
@Response<ProblemDetails>(404, "Not found")
export class EventGroupsController extends Controller {
  /**
   * Lists the event's groups ordered by creation time, oldest first.
   * @isInt limit
   * @minimum limit 1
   * @maximum limit 100
   */
  @Get()
  @SuccessResponse(200, "Event groups")
  @Middlewares(allowQueryParameters("limit", "cursor"))
  @Response<ProblemDetails>(400, "Invalid cursor")
  public async listEventGroups(
    @Request() request: unknown,
    @Path() eventId: Uuid,
    @Query() limit?: number,
    @Query() cursor?: string,
  ): Promise<EventGroupPage> {
    return listEventGroups(requestContext(request).principal, eventId, limit, cursor);
  }

  @Post()
  @SuccessResponse(201, "Event group created")
  @Response<ProblemDetails>(403, "Access denied")
  @Response<ProblemDetails>(409, "Slug already in use or event archived")
  @Response<ProblemDetails>(422, "Validation failed")
  public async createEventGroup(
    @Request() request: unknown,
    @Path() eventId: Uuid,
    @Body() body: CreateEventGroupRequest,
  ): Promise<EventGroupDto> {
    const created = await createEventGroup(requestContext(request), eventId, body);
    this.setStatus(201);
    return created;
  }

  @Get("{groupId}")
  @SuccessResponse(200, "Event group")
  public async getEventGroup(
    @Request() request: unknown,
    @Path() eventId: Uuid,
    @Path() groupId: Uuid,
  ): Promise<EventGroupDto> {
    return getEventGroup(requestContext(request).principal, eventId, groupId);
  }

  /** Replaces name, slug and description. Requires the current `version`. */
  @Put("{groupId}")
  @SuccessResponse(200, "Event group updated")
  @Response<ProblemDetails>(403, "Access denied")
  @Response<ProblemDetails>(409, "Version conflict, slug conflict or event archived")
  @Response<ProblemDetails>(422, "Validation failed")
  public async updateEventGroup(
    @Request() request: unknown,
    @Path() eventId: Uuid,
    @Path() groupId: Uuid,
    @Body() body: UpdateEventGroupRequest,
  ): Promise<EventGroupDto> {
    return updateEventGroup(requestContext(request), eventId, groupId, body);
  }

  @Delete("{groupId}")
  @SuccessResponse(204, "Event group deleted")
  @Response<ProblemDetails>(403, "Access denied")
  @Response<ProblemDetails>(409, "Event archived")
  public async deleteEventGroup(
    @Request() request: unknown,
    @Path() eventId: Uuid,
    @Path() groupId: Uuid,
  ): Promise<void> {
    await deleteEventGroup(requestContext(request), eventId, groupId);
    this.setStatus(204);
  }
}
