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
} from "tsoa";
import type { Request as ExpressRequest, Response as ExpressResponse } from "express";
import type { ProblemDetails } from "../../shared/errors/problem.js";
import { getTraceId } from "../../shared/logging/request-logging.js";
import { claimExchangeRateLimit } from "./claim-exchange-rate-limit.js";
import { exchangeClaim } from "./claim-exchange.service.js";
import type { ClaimExchangeRequest, ClaimExchangeResponse } from "./member-claim.dto.js";

@Route("auth/claims")
@Tags("Authentication")
@NoSecurity()
export class ClaimExchangeController extends Controller {
  /**
   * Exchanges a single-use participant claim for a normal browser session. The token is sent in
   * the body, never in the URL. Every unusable claim returns the same `401`.
   */
  @Post("exchange")
  @Middlewares(claimExchangeRateLimit)
  @SuccessResponse(200, "Session established")
  @Response<ProblemDetails>(401, "Claim not usable")
  @Response<ProblemDetails>(429, "Too many attempts")
  public async exchangeClaim(
    @Request() request: unknown,
    @Body() body: ClaimExchangeRequest,
  ): Promise<ClaimExchangeResponse> {
    const expressRequest = request as ExpressRequest;
    const result = await exchangeClaim(body.token, getTraceId(expressRequest));
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
