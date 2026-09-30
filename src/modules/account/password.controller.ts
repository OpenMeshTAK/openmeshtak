import { Body, Controller, Post, Request, Response, Route, Security, SuccessResponse, Tags } from "tsoa";
import type { ProblemDetails } from "../../shared/errors/problem.js";
import { requestContext } from "../../shared/http/request-context.js";
import { setFirstPassword } from "./password.service.js";

export interface SetPasswordRequest {
  /**
   * @minLength 12
   * @maxLength 128
   */
  newPassword: string;
}

@Route("me/password")
@Tags("Account")
@Security("sessionCookie")
@Response<ProblemDetails>(401, "Authentication required")
export class AccountPasswordController extends Controller {
  /**
   * Sets the first password of the signed-in account, for example after signing in with an access
   * link. It is then used for sign-in and the TAK login. Accounts that already have a password
   * change it through the authentication API with the current password.
   */
  @Post()
  @SuccessResponse(204, "Password set")
  @Response<ProblemDetails>(403, "Recent sign-in required")
  @Response<ProblemDetails>(409, "Password already set")
  public async setPassword(@Body() body: SetPasswordRequest, @Request() request: unknown): Promise<void> {
    await setFirstPassword(requestContext(request), body.newPassword);
    this.setStatus(204);
  }
}
