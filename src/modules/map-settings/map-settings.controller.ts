import { Body, Controller, Get, Put, Request, Response, Route, Security, SuccessResponse, Tags } from "tsoa";
import type { ProblemDetails } from "../../shared/errors/problem.js";
import { requestContext } from "../../shared/http/request-context.js";
import type { MapSettingsDto, UpdateMapSettingsRequest } from "./map-settings.dto.js";
import { getMapSettings, updateMapSettings } from "./map-settings.service.js";

@Route("map/settings")
@Tags("Map")
@Security("sessionCookie")
@Response<ProblemDetails>(401, "Authentication required")
export class MapSettingsController extends Controller {
  /** The base map the Web app shows. Readable by every signed-in user. */
  @Get()
  @SuccessResponse(200, "Map settings")
  public async getMapSettings(@Request() request: unknown): Promise<MapSettingsDto> {
    return getMapSettings(requestContext(request).principal);
  }

  /** Changes the base map for everyone. Requires instance-wide `settings.manage`. */
  @Put()
  @SuccessResponse(200, "Map settings updated")
  @Response<ProblemDetails>(403, "Access denied")
  @Response<ProblemDetails>(409, "Version conflict")
  @Response<ProblemDetails>(422, "Validation failed")
  public async updateMapSettings(@Request() request: unknown, @Body() body: UpdateMapSettingsRequest): Promise<MapSettingsDto> {
    return updateMapSettings(requestContext(request), body);
  }
}
