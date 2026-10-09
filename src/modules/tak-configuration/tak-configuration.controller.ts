import { Body, Controller, Get, Path, Put, Request, Response, Route, Security, SuccessResponse, Tags } from "@tsoa/runtime";
import type { ProblemDetails } from "../../shared/errors/problem.js";
import { requestContext } from "../../shared/http/request-context.js";
import type { Uuid } from "../../shared/http/uuid.js";
import type {
  TakConfigurationDto,
  UpdateAtakPreferenceFileRequest,
  UpdateAtakPreferenceFileResponse,
  UpdateTakConfigurationRequest,
} from "./tak-configuration.dto.js";
import { getTakConfiguration, updateAtakPreferenceFile, updateTakConfiguration } from "./tak-configuration.service.js";

/**
 * How the event's TAK clients connect. Reads need `events.read`, changes `events.manage`; changes
 * reach participants through a published configuration revision.
 */
@Route("events/{eventId}/tak/configuration")
@Tags("TAK configuration")
@Security("sessionCookie")
@Security("apiClientBearer")
@Response<ProblemDetails>(401, "Authentication required")
@Response<ProblemDetails>(404, "Not found")
export class TakConfigurationController extends Controller {
  @Get()
  @SuccessResponse(200, "TAK configuration")
  public async getTakConfiguration(@Request() request: unknown, @Path() eventId: Uuid): Promise<TakConfigurationDto> {
    return getTakConfiguration(requestContext(request).principal, eventId);
  }

  /** Replaces the TAK connection settings. Requires the current `version` (0 before the first save). */
  @Put()
  @SuccessResponse(200, "TAK configuration updated")
  @Response<ProblemDetails>(403, "Access denied")
  @Response<ProblemDetails>(409, "Version conflict or event archived")
  @Response<ProblemDetails>(422, "Validation failed")
  public async updateTakConfiguration(
    @Request() request: unknown,
    @Path() eventId: Uuid,
    @Body() body: UpdateTakConfigurationRequest,
  ): Promise<TakConfigurationDto> {
    return updateTakConfiguration(requestContext(request), eventId, body);
  }

  /**
   * Uploads or removes the event's ATAK preference file (`.pref`, such as ATAK's settings
   * export). Keys OpenMeshTak sets per member are removed and listed in the response.
   */
  @Put("atak-preferences")
  @SuccessResponse(200, "ATAK preference file updated")
  @Response<ProblemDetails>(403, "Access denied")
  @Response<ProblemDetails>(409, "Version conflict or event archived")
  @Response<ProblemDetails>(422, "Validation failed")
  public async updateAtakPreferenceFile(
    @Request() request: unknown,
    @Path() eventId: Uuid,
    @Body() body: UpdateAtakPreferenceFileRequest,
  ): Promise<UpdateAtakPreferenceFileResponse> {
    return updateAtakPreferenceFile(requestContext(request), eventId, body);
  }
}
