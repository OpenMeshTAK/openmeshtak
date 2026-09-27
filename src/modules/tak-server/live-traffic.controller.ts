import { Controller, Get, Path, Request, Response, Route, Security, SuccessResponse, Tags } from "tsoa";
import type { ProblemDetails } from "../../shared/errors/problem.js";
import { requestContext } from "../../shared/http/request-context.js";
import type { Uuid } from "../../shared/http/uuid.js";
import type { LiveTakTrafficDto } from "./live-traffic.dto.js";
import { getLiveTakTraffic } from "./live-traffic.service.js";

@Route("events/{eventId}/tak-traffic")
@Tags("TAK server")
@Security("sessionCookie")
@Response<ProblemDetails>(401, "Authentication required")
@Response<ProblemDetails>(403, "Access denied")
@Response<ProblemDetails>(404, "Not found")
export class LiveTakTrafficController extends Controller {
  /**
   * Connected TAK apps of the event and their current positions and markers, from the built-in
   * TAK server's memory. Requires `tak-traffic.view` for the event.
   */
  @Get()
  @SuccessResponse(200, "Live TAK traffic")
  public async getLiveTakTraffic(@Request() request: unknown, @Path() eventId: Uuid): Promise<LiveTakTrafficDto> {
    this.setHeader("Cache-Control", "no-store");
    return getLiveTakTraffic(requestContext(request).principal, eventId);
  }
}
