import { Controller, Get, Path, Request, Response, Route, Security, SuccessResponse, Tags } from "@tsoa/runtime";
import type { ProblemDetails } from "../../shared/errors/problem.js";
import { requestContext } from "../../shared/http/request-context.js";
import type {
  FirmwareProfileDto,
  FirmwareProfileSummaryDto,
} from "./firmware-profile.dto.js";
import { getFirmwareProfile, listFirmwareProfiles } from "./firmware-profiles.service.js";

/**
 * Meshtastic firmware profiles shipped with this Core release. Each one describes the settings a
 * firmware line supports; the event Meshtastic editor is rendered from it. Requires
 * `events.manage` for at least one event.
 */
@Route("meshtastic/firmware-profiles")
@Tags("Meshtastic firmware profiles")
@Security("sessionCookie")
@Security("apiClientBearer")
@Response<ProblemDetails>(401, "Authentication required")
@Response<ProblemDetails>(403, "Access denied")
export class FirmwareProfilesController extends Controller {
  /** Lists the supported firmware lines, newest first. */
  @Get()
  @SuccessResponse(200, "Firmware profiles")
  public async listFirmwareProfiles(@Request() request: unknown): Promise<FirmwareProfileSummaryDto[]> {
    return listFirmwareProfiles(requestContext(request).principal);
  }

  /** Returns the sections, fields and enums of one profile. */
  @Get("{profileId}")
  @SuccessResponse(200, "Firmware profile")
  @Response<ProblemDetails>(404, "Not found")
  public async getFirmwareProfile(
    @Request() request: unknown,
    @Path() profileId: string,
  ): Promise<FirmwareProfileDto> {
    return getFirmwareProfile(requestContext(request).principal, profileId);
  }
}
