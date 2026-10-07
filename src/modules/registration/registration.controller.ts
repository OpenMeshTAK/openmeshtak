import type { Request as ExpressRequest, Response as ExpressResponse } from "express";
import {
  Body,
  Controller,
  Get,
  Middlewares,
  NoSecurity,
  Post,
  Request,
  Response,
  Route,
  SuccessResponse,
  Tags,
} from "@tsoa/runtime";
import type { ProblemDetails } from "../../shared/errors/problem.js";
import { getTraceId } from "../../shared/logging/request-logging.js";
import type { RegisterRequest, RegisterResponse, RegistrationStatusDto } from "./registration.dto.js";
import { registrationRateLimit } from "./registration-rate-limit.js";
import { registrationMode } from "./registration-settings.service.js";
import { register } from "./registration.service.js";

@Route("registration")
@Tags("Authentication")
@NoSecurity()
export class RegistrationController extends Controller {
  /** Reports whether people may create their own account. Reveals nothing else. */
  @Get()
  @SuccessResponse(200, "Registration status")
  public async getRegistrationStatus(): Promise<RegistrationStatusDto> {
    return { mode: await registrationMode() };
  }

  /**
   * Creates an account and signs it in, if registration is open or invite-only with a usable
   * invite. New accounts have no permissions until an administrator grants some.
   */
  @Post()
  @Middlewares(registrationRateLimit)
  @SuccessResponse(201, "Account created")
  @Response<ProblemDetails>(401, "Invite not usable")
  @Response<ProblemDetails>(403, "Registration closed")
  @Response<ProblemDetails>(409, "Username taken")
  @Response<ProblemDetails>(422, "Validation failed")
  @Response<ProblemDetails>(429, "Too many attempts")
  public async register(@Request() request: unknown, @Body() body: RegisterRequest): Promise<RegisterResponse> {
    const expressRequest = request as ExpressRequest;
    const result = await register(body, getTraceId(expressRequest));
    const response = expressRequest.res as ExpressResponse | undefined;

    if (response !== undefined) {
      for (const cookie of result.responseHeaders.getSetCookie()) {
        response.append("Set-Cookie", cookie);
      }
      response.setHeader("Cache-Control", "no-store");
    }
    this.setStatus(201);
    return result.response;
  }
}
