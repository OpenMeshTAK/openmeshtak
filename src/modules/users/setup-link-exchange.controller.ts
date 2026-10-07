import {
  Body,
  Controller,
  Middlewares,
  NoSecurity,
  Post,
  Request,
  Response,
  Route,
  SuccessResponse,
  Tags,
} from "@tsoa/runtime";
import type { Request as ExpressRequest, Response as ExpressResponse } from "express";
import type { ProblemDetails } from "../../shared/errors/problem.js";
import { getTraceId } from "../../shared/logging/request-logging.js";
import { setupLinkExchangeRateLimit } from "./setup-link-exchange-rate-limit.js";
import type { SetupLinkExchangeRequest, SetupLinkExchangeResponse } from "./user.dto.js";
import { exchangeSetupLink } from "./user-setup-links.service.js";

@Route("auth/setup-links")
@Tags("Authentication")
@NoSecurity()
export class SetupLinkExchangeController extends Controller {
  /**
   * Exchanges a single-use setup link of an administrator-created user for a browser session, so
   * the person can set their first password. The token is sent in the body, never in the URL.
   * Every unusable link returns the same `401`.
   */
  @Post("exchange")
  @Middlewares(setupLinkExchangeRateLimit)
  @SuccessResponse(200, "Session established")
  @Response<ProblemDetails>(401, "Setup link not usable")
  @Response<ProblemDetails>(429, "Too many attempts")
  public async exchangeSetupLink(
    @Request() request: unknown,
    @Body() body: SetupLinkExchangeRequest,
  ): Promise<SetupLinkExchangeResponse> {
    const expressRequest = request as ExpressRequest;
    const result = await exchangeSetupLink(body.token, getTraceId(expressRequest));
    const response = expressRequest.res as ExpressResponse | undefined;

    if (response !== undefined) {
      for (const cookie of result.responseHeaders.getSetCookie()) {
        response.append("Set-Cookie", cookie);
      }
      response.setHeader("Cache-Control", "no-store");
    }
    return result.response;
  }
}
