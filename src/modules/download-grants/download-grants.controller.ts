import { Readable } from "node:stream";
import { Body, Controller, Get, NoSecurity, Path, Post, Produces, Request, Response, Route, Security, SuccessResponse, Tags } from "tsoa";
import type { ProblemDetails } from "../../shared/errors/problem.js";
import { requestContext } from "../../shared/http/request-context.js";
import { getTraceId } from "../../shared/logging/request-logging.js";
import type { CreateDownloadGrantRequest, DownloadGrantDto } from "./download-grant.dto.js";
import { createDownloadGrant, downloadWithGrant } from "./download-grants.service.js";

@Route("me/download-grants")
@Tags("Downloads")
@Security("sessionCookie")
@Response<ProblemDetails>(401, "Authentication required")
@Response<ProblemDetails>(404, "Not found")
export class DownloadGrantsController extends Controller {
  /**
   * Creates a link that downloads one artifact the signed-in user may download right now, valid
   * for 5 minutes and at most 3 downloads. Access is checked again when the link is used.
   */
  @Post()
  @SuccessResponse(201, "Download link created")
  public async createDownloadGrant(@Request() request: unknown, @Body() body: CreateDownloadGrantRequest): Promise<DownloadGrantDto> {
    this.setStatus(201);
    return createDownloadGrant(requestContext(request), body);
  }
}

/** The link token is the credential; there is deliberately no session here. */
@Route("downloads")
@Tags("Downloads")
@NoSecurity()
export class GrantedDownloadsController extends Controller {
  /** Downloads the artifact of a download link without a session. */
  @Get("{token}")
  @Produces("application/octet-stream")
  @SuccessResponse(200, "The artifact")
  @Response<ProblemDetails>(404, "Link invalid, used up or expired")
  public async downloadWithGrant(@Request() request: unknown, @Path() token: string): Promise<Readable> {
    const file = await downloadWithGrant(token, getTraceId(request as never));
    this.setHeader("Content-Type", file.contentType);
    this.setHeader("Content-Disposition", `attachment; filename="${file.fileName}"`);
    this.setHeader("Cache-Control", "no-store");
    this.setHeader("Referrer-Policy", "no-referrer");
    return Readable.from([Buffer.from(file.bytes)]);
  }
}
