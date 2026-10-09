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
import type { CreateTakGroupRequest, TakGroupDto, TakGroupPage, UpdateTakGroupRequest } from "./tak-group.dto.js";
import { createTakGroup, deleteTakGroup, getTakGroup, listTakGroups, updateTakGroup } from "./tak-groups.service.js";

/**
 * Free TAK groups for the event's advanced TAK group mode, e.g. `Medics`. Each member receives
 * from and/or sends into the groups it is assigned to. Reads need `events.read`, changes
 * `events.manage`; changes reach connected TAK apps within seconds, without publishing.
 */
@Route("events/{eventId}/tak/groups")
@Tags("TAK groups")
@Security("sessionCookie")
@Security("apiClientBearer")
@Response<ProblemDetails>(401, "Authentication required")
@Response<ProblemDetails>(404, "Not found")
export class TakGroupsController extends Controller {
  /**
   * Lists the event's TAK groups ordered by creation time, oldest first.
   * @isInt limit
   * @minimum limit 1
   * @maximum limit 100
   */
  @Get()
  @SuccessResponse(200, "TAK groups")
  @Middlewares(allowQueryParameters("limit", "cursor"))
  @Response<ProblemDetails>(400, "Invalid cursor")
  public async listTakGroups(
    @Request() request: unknown,
    @Path() eventId: Uuid,
    @Query() limit?: number,
    @Query() cursor?: string,
  ): Promise<TakGroupPage> {
    return listTakGroups(requestContext(request).principal, eventId, limit, cursor);
  }

  /**
   * @param _idempotencyKey Makes retries safe: a repeated request returns the original response.
   */
  @Post()
  @Middlewares(idempotent)
  @SuccessResponse(201, "TAK group created")
  @Response<ProblemDetails>(403, "Access denied")
  @Response<ProblemDetails>(409, "Name already in use or event archived; Idempotency-Key conflict")
  @Response<ProblemDetails>(422, "Validation failed")
  public async createTakGroup(
    @Request() request: unknown,
    @Path() eventId: Uuid,
    @Body() body: CreateTakGroupRequest,
    @Header("Idempotency-Key") _idempotencyKey?: string,
  ): Promise<TakGroupDto> {
    const created = await createTakGroup(requestContext(request), eventId, body);
    this.setStatus(201);
    return created;
  }

  /** Returns the group with its members. */
  @Get("{groupId}")
  @SuccessResponse(200, "TAK group")
  public async getTakGroup(@Request() request: unknown, @Path() eventId: Uuid, @Path() groupId: Uuid): Promise<TakGroupDto> {
    return getTakGroup(requestContext(request).principal, eventId, groupId);
  }

  /** Replaces name and description, and the members when given. Requires the current `version`. */
  @Put("{groupId}")
  @SuccessResponse(200, "TAK group updated")
  @Response<ProblemDetails>(403, "Access denied")
  @Response<ProblemDetails>(409, "Version conflict, name already in use or event archived")
  @Response<ProblemDetails>(422, "Validation failed")
  public async updateTakGroup(
    @Request() request: unknown,
    @Path() eventId: Uuid,
    @Path() groupId: Uuid,
    @Body() body: UpdateTakGroupRequest,
  ): Promise<TakGroupDto> {
    return updateTakGroup(requestContext(request), eventId, groupId, body);
  }

  @Delete("{groupId}")
  @SuccessResponse(204, "TAK group deleted")
  @Response<ProblemDetails>(403, "Access denied")
  @Response<ProblemDetails>(409, "Event archived")
  public async deleteTakGroup(@Request() request: unknown, @Path() eventId: Uuid, @Path() groupId: Uuid): Promise<void> {
    await deleteTakGroup(requestContext(request), eventId, groupId);
    this.setStatus(204);
  }
}
