import { Readable } from "node:stream";
import { Controller, Get, Post, Produces, Request, Response, Route, Security, SuccessResponse, Tags } from "@tsoa/runtime";
import type { ProblemDetails } from "../../shared/errors/problem.js";
import { requestContext } from "../../shared/http/request-context.js";
import type { TakEnrollmentDto } from "./enrollment.dto.js";
import { createConnectionPackage } from "./connection-package.service.js";
import { createTakEnrollment } from "./enrollment.service.js";

@Route("me/tak-enrollments")
@Tags("TAK server")
@Security("sessionCookie")
@Response<ProblemDetails>(401, "Authentication required")
@Response<ProblemDetails>(403, "No TAK access")
export class TakEnrollmentsController extends Controller {
  /**
   * Returns the TAK login of the signed-in user (account username, used with the account
   * password) and a fresh QR token in the ATAK enrollment link, valid until the end of the user's
   * latest active event. Members of active events and holders of `tak-server.admin-access` may
   * enroll. QR tokens never carry the account password.
   */
  @Post()
  @SuccessResponse(201, "Enrollment created")
  @Response<ProblemDetails>(409, "TAK server not enabled")
  public async createTakEnrollment(@Request() request: unknown): Promise<TakEnrollmentDto> {
    this.setStatus(201);
    return createTakEnrollment(requestContext(request));
  }
}

@Route("me/tak-connection-package")
@Tags("TAK server")
@Security("sessionCookie")
@Response<ProblemDetails>(401, "Authentication required")
@Response<ProblemDetails>(403, "No TAK access")
export class TakConnectionPackageController extends Controller {
  /**
   * A TAK Data Package with the server address and the CA to trust, for TAK apps that enroll by
   * importing a package instead of scanning the enrollment code. It contains no key or password;
   * the app asks for the enrollment user name and password.
   */
  @Get()
  @Produces("application/zip")
  @SuccessResponse(200, "Connection Data Package")
  @Response<ProblemDetails>(409, "TAK server not enabled")
  public async getTakConnectionPackage(@Request() request: unknown): Promise<Readable> {
    const { fileName, bytes } = await createConnectionPackage(requestContext(request));
    this.setHeader("Content-Type", "application/zip");
    this.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
    return Readable.from([Buffer.from(bytes)]);
  }
}
