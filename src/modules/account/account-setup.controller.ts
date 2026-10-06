import { Body, Controller, Post, Request, Response, Route, Security, SuccessResponse, Tags } from "@tsoa/runtime";
import type { ProblemDetails } from "../../shared/errors/problem.js";
import { requestContext } from "../../shared/http/request-context.js";
import { completeAccountSetup } from "./account-setup.service.js";

export interface AccountSetupRequest {
  /**
   * @minLength 12
   * @maxLength 128
   */
  newPassword: string;
  /**
   * Sign-in and TAK login name; keeps the one derived from the name when omitted.
   * @pattern ^[a-z0-9._-]{3,32}$
   */
  username?: string;
}

@Route("me/account-setup")
@Tags("Account")
@Security("sessionCookie")
@Response<ProblemDetails>(401, "Authentication required")
export class AccountSetupController extends Controller {
  /**
   * Completes an account without a password, for example right after signing in with an access
   * link: optionally picks the username and sets the first password, used for sign-in and the TAK
   * login. Accounts that already have a password change it through the authentication API.
   */
  @Post()
  @SuccessResponse(204, "Account set up")
  @Response<ProblemDetails>(403, "Recent sign-in required")
  @Response<ProblemDetails>(409, "Password already set or username taken")
  public async completeAccountSetup(@Body() body: AccountSetupRequest, @Request() request: unknown): Promise<void> {
    await completeAccountSetup(requestContext(request), body);
    this.setStatus(204);
  }
}
