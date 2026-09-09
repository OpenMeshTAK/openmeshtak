import type { Response } from "express";
import {
  Body,
  Controller,
  Middlewares,
  NoSecurity,
  Post,
  Request,
  Route,
  SuccessResponse,
  Tags,
} from "tsoa";
import { createInitialAdministrator } from "./bootstrap.service.js";
import { setupRateLimit } from "./setup-rate-limit.js";

export interface SetupRequest {
  /** @format email */
  email: string;
  /** @minLength 1 @maxLength 100 */
  name: string;
  /** @minLength 12 @maxLength 128 */
  password: string;
  /** @minLength 48 @maxLength 128 */
  token: string;
}

export interface SetupResponse {
  user: {
    id: string;
    name: string;
    email: string;
  };
}

@Route("setup")
@Tags("Setup")
@NoSecurity()
export class SetupController extends Controller {
  /** Creates the first password-backed administrator using the one-time operator token. */
  @Post()
  @Middlewares(setupRateLimit)
  @SuccessResponse(201, "Administrator created")
  public async createAdministrator(
    @Body() body: SetupRequest,
    @Request() request: unknown,
  ): Promise<SetupResponse> {
    const result = await createInitialAdministrator(body);
    const response = (request as { res?: Response }).res;

    if (response !== undefined) {
      for (const cookie of result.responseHeaders.getSetCookie()) {
        response.append("Set-Cookie", cookie);
      }
      response.setHeader("Cache-Control", "no-store");
    }

    this.setStatus(201);
    return {
      user: {
        id: result.id,
        name: result.name,
        email: result.email,
      },
    };
  }
}
