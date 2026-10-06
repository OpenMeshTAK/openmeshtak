import type { Response } from "express";
import {
  Body,
  Controller,
  Get,
  Middlewares,
  NoSecurity,
  Post,
  Request,
  Route,
  SuccessResponse,
  Tags,
} from "@tsoa/runtime";
import { createInitialAdministrator, isConfigured } from "./bootstrap.service.js";
import { setupRateLimit } from "./setup-rate-limit.js";

export interface SetupRequest {
  /** @format email */
  email: string;
  /** @minLength 1 @maxLength 100 */
  name: string;
  /**
   * Sign-in and TAK login name: 3 to 32 lowercase letters, digits, dots, underscores or hyphens.
   * @pattern ^[a-z0-9._-]{3,32}$
   */
  username: string;
  /** @minLength 12 @maxLength 128 */
  password: string;
  /** @minLength 48 @maxLength 128 */
  token: string;
}

export interface SetupStatusResponse {
  /** `false` until the first administrator exists; the Web app then opens the setup flow. */
  configured: boolean;
}

export interface SetupResponse {
  user: {
    id: string;
    name: string;
    username: string;
    email: string;
  };
}

@Route("setup")
@Tags("Setup")
@NoSecurity()
export class SetupController extends Controller {
  /** Reports whether first-administrator setup has been completed. Reveals nothing else. */
  @Get()
  @SuccessResponse(200, "Setup status")
  public async getSetupStatus(): Promise<SetupStatusResponse> {
    return { configured: await isConfigured() };
  }

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
        username: result.username,
        email: result.email,
      },
    };
  }
}
