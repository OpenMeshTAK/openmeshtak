import {
  Controller,
  Delete,
  Get,
  Middlewares,
  Path,
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
import type { EventMemberDto, EventMemberPage } from "./event-member.dto.js";
import { deleteEventMember, getEventMember, listEventMembers } from "./event-members.service.js";

@Route("events/{eventId}/members")
@Tags("Event members")
@Security("sessionCookie")
@Security("serviceAccountBearer")
@Response<ProblemDetails>(401, "Authentication required")
@Response<ProblemDetails>(403, "Access denied")
@Response<ProblemDetails>(404, "Not found")
export class EventMembersController extends Controller {
  /**
   * Lists the event's members ordered by creation time, oldest first. Requires `members.read`.
   * @isInt limit
   * @minimum limit 1
   * @maximum limit 100
   */
  @Get()
  @SuccessResponse(200, "Event members")
  @Middlewares(allowQueryParameters("limit", "cursor"))
  @Response<ProblemDetails>(400, "Invalid cursor")
  public async listEventMembers(
    @Request() request: unknown,
    @Path() eventId: Uuid,
    @Query() limit?: number,
    @Query() cursor?: string,
  ): Promise<EventMemberPage> {
    return listEventMembers(requestContext(request).principal, eventId, limit, cursor);
  }

  @Get("{memberId}")
  @SuccessResponse(200, "Event member")
  public async getEventMember(
    @Request() request: unknown,
    @Path() eventId: Uuid,
    @Path() memberId: Uuid,
  ): Promise<EventMemberDto> {
    return getEventMember(requestContext(request).principal, eventId, memberId);
  }

  /**
   * Removes the member from this event only. The user and other event participations remain.
   * Requires `members.manage`.
   */
  @Delete("{memberId}")
  @SuccessResponse(204, "Event member removed")
  @Response<ProblemDetails>(409, "Event archived")
  public async deleteEventMember(
    @Request() request: unknown,
    @Path() eventId: Uuid,
    @Path() memberId: Uuid,
  ): Promise<void> {
    await deleteEventMember(requestContext(request), eventId, memberId);
    this.setStatus(204);
  }
}
