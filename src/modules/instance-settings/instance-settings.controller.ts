import { Body, Controller, Get, NoSecurity, Put, Request, Response, Route, Security, SuccessResponse, Tags } from "@tsoa/runtime";
import type { ProblemDetails } from "../../shared/errors/problem.js";
import { requestContext } from "../../shared/http/request-context.js";
import type { InstanceSettingsDto, UpdateInstanceSettingsRequest } from "./instance-settings.dto.js";
import { getInstanceSettings, updateInstanceSettings } from "./instance-settings.service.js";

@Route("instance")
@Tags("Instance")
export class InstanceSettingsController extends Controller {
  /** How this installation presents itself. Public, because the sign-in page shows it. */
  @Get()
  @NoSecurity()
  @SuccessResponse(200, "Instance settings")
  public async getInstanceSettings(): Promise<InstanceSettingsDto> {
    return getInstanceSettings();
  }

  /** Renames the installation. Requires instance-wide `settings.manage`. */
  @Put()
  @Security("sessionCookie")
  @SuccessResponse(200, "Instance settings updated")
  @Response<ProblemDetails>(401, "Authentication required")
  @Response<ProblemDetails>(403, "Access denied")
  @Response<ProblemDetails>(409, "Version conflict")
  @Response<ProblemDetails>(422, "Validation failed")
  public async updateInstanceSettings(@Request() request: unknown, @Body() body: UpdateInstanceSettingsRequest): Promise<InstanceSettingsDto> {
    return updateInstanceSettings(requestContext(request), body);
  }
}
