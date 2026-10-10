import { Controller, Get, Request, Response, Route, Security, SuccessResponse, Tags } from "@tsoa/runtime";
import type { ProblemDetails } from "../../shared/errors/problem.js";
import { requestContext } from "../../shared/http/request-context.js";
import type { SystemStatusDto } from "./system-status.dto.js";
import { systemStatus } from "./system-status.service.js";

@Route("system-status")
@Tags("Operations")
@Security("sessionCookie")
@Response<ProblemDetails>(401, "Authentication required")
@Response<ProblemDetails>(403, "Access denied")
export class SystemStatusController extends Controller {
  /**
   * Health overview for operators: database, data disk, TAK server, its certificate and recent
   * errors, with a few numbers. Requires instance-wide `server-logs.read`.
   */
  @Get()
  @SuccessResponse(200, "System status")
  public async getSystemStatus(@Request() request: unknown): Promise<SystemStatusDto> {
    this.setHeader("Cache-Control", "no-store");
    return systemStatus(requestContext(request).principal);
  }
}
