import { Body, Controller, Middlewares, Path, Post, Request, Response, Route, Security, SuccessResponse, Tags } from "@tsoa/runtime";
import { rateLimit } from "express-rate-limit";
import { sendProblem, type ProblemDetails } from "../../shared/errors/problem.js";
import { requestContext } from "../../shared/http/request-context.js";
import type { Uuid } from "../../shared/http/uuid.js";
import { getTraceId } from "../../shared/logging/request-logging.js";
import type { MeshObservationBatchRequest, MeshObservationBatchResultDto } from "./mesh-observation.dto.js";
import { ingestMeshObservations } from "./mesh-observations.service.js";

/**
 * An HQ sends a batch every few seconds and empties its outbox in a burst after an outage; this
 * leaves plenty of room for both while stopping a runaway client from flooding the database.
 */
const uplinkRateLimit = rateLimit({
  windowMs: 60_000,
  limit: 300,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  handler(request, response): void {
    sendProblem(response, {
      type: "urn:openmeshtak:problem:rate-limited",
      title: "Too many mesh uploads",
      status: 429,
      detail: "Wait a moment before sending more mesh observations.",
      code: "RATE_LIMITED",
      traceId: getTraceId(request),
    });
  },
});

/**
 * Mesh uplink: an HQ PC with internet forwards the Meshtastic positions and node info its USB radio
 * hears. Requires `mesh-uplink.send` for the event.
 */
@Route("events/{eventId}/mesh-observations")
@Tags("Mesh uplink")
@Security("sessionCookie")
@Security("apiClientBearer")
@Response<ProblemDetails>(401, "Authentication required")
@Response<ProblemDetails>(404, "Not found")
export class MeshObservationsController extends Controller {
  /**
   * Accepts up to 200 decoded `POSITION_APP` and `NODEINFO_APP` observations. Every observation
   * gets a final result in request order, so the HQ can delete the whole batch from its outbox:
   * packets already received (by retry or another HQ) answer `duplicate`, unusable ones
   * `rejected` with a code. Accepted positions appear in the event's live view and, when the event
   * records, in its history; they are never sent to TAK apps.
   */
  @Post()
  @Middlewares(uplinkRateLimit)
  @SuccessResponse(200, "Batch processed")
  @Response<ProblemDetails>(403, "Access denied")
  @Response<ProblemDetails>(409, "Event not active or Meshtastic off")
  @Response<ProblemDetails>(422, "Validation failed")
  @Response<ProblemDetails>(429, "Too many uploads")
  public async uploadMeshObservations(
    @Request() request: unknown,
    @Path() eventId: Uuid,
    @Body() body: MeshObservationBatchRequest,
  ): Promise<MeshObservationBatchResultDto> {
    return ingestMeshObservations(requestContext(request), eventId, body);
  }
}
