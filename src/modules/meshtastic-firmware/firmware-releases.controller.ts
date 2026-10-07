import { Body, Controller, Get, Put, Request, Response, Route, Security, SuccessResponse, Tags } from "@tsoa/runtime";
import type { ProblemDetails } from "../../shared/errors/problem.js";
import { requestContext } from "../../shared/http/request-context.js";
import type {
  FirmwareReleaseListDto,
  FirmwareReleaseSettingsDto,
  UpdateFirmwareReleaseSettingsRequest,
} from "./firmware-release.dto.js";
import {
  getFirmwareReleaseSettings,
  listFirmwareReleases,
  updateFirmwareReleaseSettings,
} from "./firmware-releases.service.js";

/**
 * Published Meshtastic firmware releases as the official flasher lists them, each marked with
 * whether a shipped firmware profile supports it.
 */
@Route("meshtastic/firmware-releases")
@Tags("Meshtastic firmware profiles")
@Response<ProblemDetails>(401, "Authentication required")
@Response<ProblemDetails>(403, "Access denied")
export class FirmwareReleasesController extends Controller {
  /**
   * Lists full releases, newest first. When the flasher cannot be reached, the last downloaded
   * list is returned; without one the list is unknown. Requires `events.manage` for at least one
   * event.
   */
  @Get()
  @Security("sessionCookie")
  @Security("apiClientBearer")
  @SuccessResponse(200, "Firmware releases")
  public async listFirmwareReleases(@Request() request: unknown): Promise<FirmwareReleaseListDto> {
    return listFirmwareReleases(requestContext(request).principal);
  }

  /** Whether Core looks up releases. Requires instance-wide `settings.manage`. */
  @Get("settings")
  @Security("sessionCookie")
  @SuccessResponse(200, "Firmware release settings")
  public async getFirmwareReleaseSettings(@Request() request: unknown): Promise<FirmwareReleaseSettingsDto> {
    return getFirmwareReleaseSettings(requestContext(request).principal);
  }

  /** Switches release lookups on or off. Requires instance-wide `settings.manage`. */
  @Put("settings")
  @Security("sessionCookie")
  @SuccessResponse(200, "Firmware release settings updated")
  @Response<ProblemDetails>(409, "Version conflict")
  @Response<ProblemDetails>(422, "Validation failed")
  public async updateFirmwareReleaseSettings(
    @Request() request: unknown,
    @Body() body: UpdateFirmwareReleaseSettingsRequest,
  ): Promise<FirmwareReleaseSettingsDto> {
    return updateFirmwareReleaseSettings(requestContext(request), body);
  }
}
