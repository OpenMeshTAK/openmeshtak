import { Readable } from "node:stream";
import { Controller, Get, Path, Produces, Request, Response, Route, Security, SuccessResponse, Tags } from "tsoa";
import type { ProblemDetails } from "../../shared/errors/problem.js";
import { requestContext } from "../../shared/http/request-context.js";
import type { Uuid } from "../../shared/http/uuid.js";
import type { MemberDataPackageDto } from "./member-data-package.dto.js";
import { downloadMemberDataPackage, listMemberDataPackages } from "./member-data-packages.service.js";

/** The published Data Packages a member receives according to each package's audience. */
@Route("events/{eventId}/members/{memberId}/data-packages")
@Tags("Profiles")
@Security("sessionCookie")
@Response<ProblemDetails>(401, "Authentication required")
@Response<ProblemDetails>(404, "Not found")
export class MemberDataPackagesController extends Controller {
  /** The member's packages; `members.read` previews and `member-artifacts.download` acts on their behalf. */
  @Get()
  @SuccessResponse(200, "Data packages the member receives")
  public async listMemberDataPackages(
    @Request() request: unknown,
    @Path() eventId: Uuid,
    @Path() memberId: Uuid,
  ): Promise<MemberDataPackageDto[]> {
    return listMemberDataPackages(requestContext(request).principal, eventId, memberId);
  }

  /** Downloads the newest published revision as an ATAK Data Package, for the member or on their behalf. */
  @Get("{packageId}/atak")
  @Produces("application/zip")
  @SuccessResponse(200, "ATAK Data Package")
  public async downloadMemberDataPackage(
    @Request() request: unknown,
    @Path() eventId: Uuid,
    @Path() memberId: Uuid,
    @Path() packageId: Uuid,
  ): Promise<Readable> {
    const { fileName, bytes } = await downloadMemberDataPackage(requestContext(request), eventId, memberId, packageId);
    this.setHeader("Content-Type", "application/zip");
    this.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
    return Readable.from([Buffer.from(bytes)]);
  }
}
