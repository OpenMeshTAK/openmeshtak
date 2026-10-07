import { Controller, Get, Middlewares, Query, Request, Response, Route, Security, SuccessResponse, Tags } from "@tsoa/runtime";
import type { ProblemDetails } from "../../shared/errors/problem.js";
import { allowQueryParameters } from "../../shared/http/query-allowlist.js";
import { requestContext } from "../../shared/http/request-context.js";
import type { ServerLogPage } from "./server-logs.dto.js";
import { listServerLogs } from "./server-logs.service.js";

@Route("server-logs")
@Tags("Server log")
@Security("sessionCookie")
@Response<ProblemDetails>(401, "Authentication required")
@Response<ProblemDetails>(403, "Access denied")
export class ServerLogsController extends Controller {
  /**
   * Core's most recent log lines from memory, sanitized like the container log. Without `after`
   * it returns the newest lines; with `after` only lines written since. Requires instance-wide
   * `server-logs.read`.
   * @isInt after
   * @minimum after 0
   */
  @Get()
  @SuccessResponse(200, "Server log lines")
  @Middlewares(allowQueryParameters("after"))
  @Response<ProblemDetails>(422, "Validation failed")
  public async listServerLogs(@Request() request: unknown, @Query() after?: number): Promise<ServerLogPage> {
    this.setHeader("Cache-Control", "no-store");
    return listServerLogs(requestContext(request).principal, after);
  }
}
