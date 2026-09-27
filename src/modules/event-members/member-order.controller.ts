import { Body, Controller, Path, Put, Request, Response, Route, Security, SuccessResponse, Tags } from "tsoa";
import type { ProblemDetails } from "../../shared/errors/problem.js";
import { requestContext } from "../../shared/http/request-context.js";
import type { Uuid } from "../../shared/http/uuid.js";
import type { EventMemberDto } from "./event-member.dto.js";
import { reorderGroupMembers, type ReorderGroupMembersRequest } from "./member-order.service.js";

@Route("events/{eventId}/groups/{groupId}/member-order")
@Tags("Event members")
@Security("sessionCookie")
@Security("serviceAccountBearer")
@Response<ProblemDetails>(401, "Authentication required")
@Response<ProblemDetails>(403, "Access denied")
@Response<ProblemDetails>(404, "Not found")
export class GroupMemberOrderController extends Controller {
  /**
   * Renumbers the group's short names `1..n` in the given order. Send every current member of
   * the group exactly once. Requires `members.manage`. Devices keep their old short name until
   * the member is provisioned again.
   */
  @Put()
  @SuccessResponse(200, "Members in their new order")
  @Response<ProblemDetails>(409, "Members changed meanwhile, short name too long or event archived")
  public async reorderGroupMembers(
    @Request() request: unknown,
    @Path() eventId: Uuid,
    @Path() groupId: Uuid,
    @Body() body: ReorderGroupMembersRequest,
  ): Promise<EventMemberDto[]> {
    return reorderGroupMembers(requestContext(request), eventId, groupId, body);
  }
}
