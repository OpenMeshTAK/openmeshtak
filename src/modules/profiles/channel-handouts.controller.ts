import { Controller, Get, Path, Request, Response, Route, Security, SuccessResponse, Tags } from "tsoa";
import type { ProblemDetails } from "../../shared/errors/problem.js";
import { requestContext } from "../../shared/http/request-context.js";
import type { Uuid } from "../../shared/http/uuid.js";
import type { ChannelHandoutDto } from "./channel-handout.dto.js";
import { getChannelHandout } from "./channel-handouts.service.js";

@Route("events/{eventId}/members/{memberId}/meshtastic/channels/{channelId}/handout")
@Tags("Profiles")
@Security("sessionCookie")
@Response<ProblemDetails>(401, "Authentication required")
@Response<ProblemDetails>(404, "Not found")
export class ChannelHandoutsController extends Controller {
  /**
   * Delivers an audited Meshtastic channel URL to the signed-in member when the published event
   * configuration designates that member as a key holder. The URL contains secret key material.
   */
  @Get()
  @SuccessResponse(200, "Channel handout")
  public async getChannelHandout(
    @Request() request: unknown,
    @Path() eventId: Uuid,
    @Path() memberId: Uuid,
    @Path() channelId: Uuid,
  ): Promise<ChannelHandoutDto> {
    return getChannelHandout(requestContext(request), eventId, memberId, channelId);
  }
}
