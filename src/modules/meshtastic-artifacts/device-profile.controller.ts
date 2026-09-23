import { Readable } from "node:stream";
import { Controller, Get, Path, Produces, Request, Response, Route, Security, SuccessResponse, Tags } from "tsoa";
import type { ProblemDetails } from "../../shared/errors/problem.js";
import { requestContext } from "../../shared/http/request-context.js";
import type { Uuid } from "../../shared/http/uuid.js";
import { generateDeviceProfile } from "./device-profile.service.js";

@Route("events/{eventId}/members/{memberId}/meshtastic/device-profile")
@Tags("Profiles")
@Security("sessionCookie")
@Response<ProblemDetails>(401, "Authentication required")
@Response<ProblemDetails>(404, "Not found")
export class DeviceProfileController extends Controller {
  /**
   * Generates the signed-in member's Meshtastic device profile (`.cfg`) from the published event
   * configuration: owner names, device role, the event's radio settings and the channels the
   * member receives now. An operator with `member-artifacts.download` receives exactly the
   * member's file on their behalf. The file contains channel keys; every download is audited. The file
   * name names the firmware line it is made for.
   */
  @Get()
  @Produces("application/octet-stream")
  @SuccessResponse(200, "Meshtastic device profile")
  @Response<ProblemDetails>(409, "Meshtastic configuration not published")
  public async getMeshtasticDeviceProfile(
    @Request() request: unknown,
    @Path() eventId: Uuid,
    @Path() memberId: Uuid,
  ): Promise<Readable> {
    const { fileName, bytes } = await generateDeviceProfile(requestContext(request), eventId, memberId);
    this.setHeader("Content-Type", "application/octet-stream");
    this.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
    return Readable.from([Buffer.from(bytes)]);
  }
}
