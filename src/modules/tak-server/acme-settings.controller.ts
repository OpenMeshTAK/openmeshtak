import { Body, Controller, Get, Post, Put, Request, Response, Route, Security, SuccessResponse, Tags } from "tsoa";
import type { ProblemDetails } from "../../shared/errors/problem.js";
import { requestContext } from "../../shared/http/request-context.js";
import type { TakAcmeSettingsDto, UpdateTakAcmeSettingsRequest } from "./acme-settings.dto.js";
import { getTakAcmeSettings, renewTakAcmeCertificate, updateTakAcmeSettings } from "./acme-settings.service.js";

/** Automatic public certificates for the built-in TAK server. Requires `tak-server.manage`. */
@Route("tak-server/acme")
@Tags("TAK server")
@Security("sessionCookie")
@Response<ProblemDetails>(401, "Authentication required")
@Response<ProblemDetails>(403, "Access denied")
export class TakAcmeSettingsController extends Controller {
  @Get()
  @SuccessResponse(200, "ACME settings")
  public async getSettings(@Request() request: unknown): Promise<TakAcmeSettingsDto> {
    return getTakAcmeSettings(requestContext(request).principal);
  }

  /** Replaces settings. The provider token is write-only; omit it to keep the stored value. */
  @Put()
  @SuccessResponse(200, "ACME settings updated")
  @Response<ProblemDetails>(409, "Version conflict")
  @Response<ProblemDetails>(422, "Validation failed")
  public async updateSettings(
    @Request() request: unknown,
    @Body() body: UpdateTakAcmeSettingsRequest,
  ): Promise<TakAcmeSettingsDto> {
    return updateTakAcmeSettings(requestContext(request), body);
  }

  /** Immediately obtains or renews the public certificate with the configured solver. */
  @Post("renew")
  @SuccessResponse(200, "Certificate renewed")
  @Response<ProblemDetails>(422, "ACME is disabled")
  @Response<ProblemDetails>(502, "ACME renewal failed")
  public async renew(@Request() request: unknown): Promise<TakAcmeSettingsDto> {
    return renewTakAcmeCertificate(requestContext(request));
  }
}
