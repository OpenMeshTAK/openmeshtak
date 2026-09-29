import { Body, Controller, Get, Path, Put, Request, Response, Route, Security, SuccessResponse, Tags } from "tsoa";
import type { ProblemDetails } from "../../shared/errors/problem.js";
import { requestContext } from "../../shared/http/request-context.js";
import type { Uuid } from "../../shared/http/uuid.js";
import type { TakTrafficRecordingDto, UpdateTakTrafficRecordingRequest } from "./traffic-recording.dto.js";
import { exportTakTraffic, getTakTrafficRecording, updateTakTrafficRecording } from "./traffic-recording.service.js";

/** Opt-in recording of an event's TAK traffic. Off by default. */
@Route("events/{eventId}/tak-traffic/recording")
@Tags("TAK server")
@Security("sessionCookie")
@Response<ProblemDetails>(401, "Authentication required")
@Response<ProblemDetails>(403, "Access denied")
@Response<ProblemDetails>(404, "Not found")
export class TakTrafficRecordingController extends Controller {
  /** Requires `tak-traffic.view` for the event. */
  @Get()
  @SuccessResponse(200, "Recording settings")
  public async getTakTrafficRecording(@Request() request: unknown, @Path() eventId: Uuid): Promise<TakTrafficRecordingDto> {
    return getTakTrafficRecording(requestContext(request).principal, eventId);
  }

  /** Turns recording on or off and sets the retention in days. Requires `events.manage`. */
  @Put()
  @SuccessResponse(200, "Recording settings updated")
  @Response<ProblemDetails>(409, "Version conflict")
  @Response<ProblemDetails>(422, "Validation failed")
  public async updateTakTrafficRecording(
    @Request() request: unknown,
    @Path() eventId: Uuid,
    @Body() body: UpdateTakTrafficRecordingRequest,
  ): Promise<TakTrafficRecordingDto> {
    return updateTakTrafficRecording(requestContext(request), eventId, body);
  }

  /**
   * The recorded positions and markers as a GeoJSON FeatureCollection, oldest first, at most
   * 50,000 items. Requires `tak-traffic.view`; every export is audited.
   */
  @Get("export")
  @SuccessResponse(200, "Recorded traffic as GeoJSON")
  public async exportTakTraffic(@Request() request: unknown, @Path() eventId: Uuid): Promise<unknown> {
    this.setHeader("Content-Type", "application/geo+json");
    this.setHeader("Content-Disposition", 'attachment; filename="tak-traffic.geojson"');
    this.setHeader("Cache-Control", "no-store");
    return exportTakTraffic(requestContext(request), eventId);
  }
}
