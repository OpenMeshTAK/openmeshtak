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
  CreateEventRoleRequest,
  EventRoleDto,
  EventRolePage,
  UpdateEventRoleRequest,
} from "./event-role.dto.js";
import {
  createEventRole,
  deleteEventRole,
  getEventRole,
  listEventRoles,
  updateEventRole,
} from "./event-roles.service.js";

/**
 * Event roles describe what a participant does in one event. Every member has exactly one role.
 * Roles never grant permissions; reads need `events.read` and changes `events.manage`.
 */
@Route("events/{eventId}/roles")
@Tags("Event roles")
@Security("sessionCookie")
@Security("serviceAccountBearer")
@Response<ProblemDetails>(401, "Authentication required")
@Response<ProblemDetails>(404, "Not found")
export class EventRolesController extends Controller {
  /**
   * Lists the event's roles ordered by creation time, oldest first.
   * @isInt limit
   * @minimum limit 1
   * @maximum limit 100
   */
  @Get()
  @SuccessResponse(200, "Event roles")
  @Middlewares(allowQueryParameters("limit", "cursor"))
  @Response<ProblemDetails>(400, "Invalid cursor")
  public async listEventRoles(
    @Request() request: unknown,
    @Path() eventId: Uuid,
    @Query() limit?: number,
    @Query() cursor?: string,
  ): Promise<EventRolePage> {
    return listEventRoles(requestContext(request).principal, eventId, limit, cursor);
  }

  @Post()
  @SuccessResponse(201, "Event role created")
  @Response<ProblemDetails>(403, "Access denied")
  @Response<ProblemDetails>(409, "Slug already in use or event archived")
  @Response<ProblemDetails>(422, "Validation failed")
  public async createEventRole(
    @Request() request: unknown,
    @Path() eventId: Uuid,
    @Body() body: CreateEventRoleRequest,
  ): Promise<EventRoleDto> {
    const created = await createEventRole(requestContext(request), eventId, body);
    this.setStatus(201);
    return created;
  }

  @Get("{roleId}")
  @SuccessResponse(200, "Event role")
  public async getEventRole(
    @Request() request: unknown,
    @Path() eventId: Uuid,
    @Path() roleId: Uuid,
  ): Promise<EventRoleDto> {
    return getEventRole(requestContext(request).principal, eventId, roleId);
  }

  /** Replaces name, slug and description. Requires the current `version`. */
  @Put("{roleId}")
  @SuccessResponse(200, "Event role updated")
  @Response<ProblemDetails>(403, "Access denied")
  @Response<ProblemDetails>(409, "Version conflict, slug conflict or event archived")
  @Response<ProblemDetails>(422, "Validation failed")
  public async updateEventRole(
    @Request() request: unknown,
    @Path() eventId: Uuid,
    @Path() roleId: Uuid,
    @Body() body: UpdateEventRoleRequest,
  ): Promise<EventRoleDto> {
    return updateEventRole(requestContext(request), eventId, roleId, body);
  }

  @Delete("{roleId}")
  @SuccessResponse(204, "Event role deleted")
  @Response<ProblemDetails>(403, "Access denied")
  @Response<ProblemDetails>(409, "Event archived")
  public async deleteEventRole(
    @Request() request: unknown,
    @Path() eventId: Uuid,
    @Path() roleId: Uuid,
  ): Promise<void> {
    await deleteEventRole(requestContext(request), eventId, roleId);
    this.setStatus(204);
  }
}
