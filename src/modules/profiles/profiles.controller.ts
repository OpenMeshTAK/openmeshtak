import { Controller, Get, Path, Request, Response, Route, Security, SuccessResponse, Tags } from "tsoa";
import type { ProblemDetails } from "../../shared/errors/problem.js";
import { requestContext } from "../../shared/http/request-context.js";
import type { Uuid } from "../../shared/http/uuid.js";
import type { MyEventMembershipDto, ResolvedProfileDto } from "./profile.dto.js";
import { getMemberProfile, listMyEventMemberships } from "./profiles.service.js";

@Route("events/{eventId}/members/{memberId}/profile")
@Tags("Profiles")
@Security("sessionCookie")
@Security("serviceAccountBearer")
@Response<ProblemDetails>(401, "Authentication required")
@Response<ProblemDetails>(403, "Access denied")
@Response<ProblemDetails>(404, "Not found")
export class MemberProfileController extends Controller {
  /**
   * Resolves the member's callsign, TAK and Meshtastic identity and mission groups. Requires
   * `members.read`, or being that member in an active event. Draft events return an
   * administrator preview of the unpublished configuration.
   */
  @Get()
  @SuccessResponse(200, "Resolved profile")
  @Response<ProblemDetails>(409, "Configuration not published")
  public async getMemberProfile(
    @Request() request: unknown,
    @Path() eventId: Uuid,
    @Path() memberId: Uuid,
  ): Promise<ResolvedProfileDto> {
    return getMemberProfile(requestContext(request).principal, eventId, memberId);
  }
}

@Route("me/event-memberships")
@Tags("Profiles")
@Security("sessionCookie")
@Response<ProblemDetails>(401, "Authentication required")
export class MyEventMembershipsController extends Controller {
  /** Lists the signed-in user's memberships in active events. */
  @Get()
  @SuccessResponse(200, "Active event memberships")
  public async listMyEventMemberships(@Request() request: unknown): Promise<MyEventMembershipDto[]> {
    return listMyEventMemberships(requestContext(request).principal);
  }
}
