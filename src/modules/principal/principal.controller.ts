import { Controller, Get, Request, Response, Route, Security, SuccessResponse, Tags } from "@tsoa/runtime";
import type { ProblemDetails } from "../../shared/errors/problem.js";
import { requestContext } from "../../shared/http/request-context.js";
import { describePrincipal, type PrincipalDto } from "./principal.service.js";

@Route("principal")
@Tags("Authentication")
export class PrincipalController extends Controller {
  /**
   * Describes the authenticated caller and its effective grants. Integrations use it to verify
   * an API key; the Web application uses it to adapt navigation. It never replaces server-side
   * authorization.
   */
  @Get()
  @SuccessResponse(200, "Authenticated principal")
  @Security("sessionCookie")
  @Security("apiClientBearer")
  @Response<ProblemDetails>(401, "Authentication required")
  public async getPrincipal(@Request() request: unknown): Promise<PrincipalDto> {
    return describePrincipal(requestContext(request).principal);
  }
}
