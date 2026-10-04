import {
  Controller,
  Get,
  Middlewares,
  Path,
  Post,
  Query,
  Request,
  Response,
  Route,
  Security,
  SuccessResponse,
  Tags,
} from "tsoa";
import type { ProblemDetails } from "../../shared/errors/problem.js";
import { allowQueryParameters } from "../../shared/http/query-allowlist.js";
import { requestContext } from "../../shared/http/request-context.js";
import type { Uuid } from "../../shared/http/uuid.js";
import type { PackageRevisionDto, PackageRevisionPage, PublishDataPackageResponse } from "./package-revision.dto.js";
import { getRevision, listRevisions, publishDataPackage } from "./package-revisions.service.js";

/** Immutable published data package states. Packages reference a revision, never the draft. */
@Route("events/{eventId}/data-packages/{packageId}/revisions")
@Tags("Data packages")
@Security("sessionCookie")
@Security("apiClientBearer")
@Response<ProblemDetails>(401, "Authentication required")
@Response<ProblemDetails>(403, "Access denied")
@Response<ProblemDetails>(404, "Not found")
export class PackageRevisionsController extends Controller {
  /**
   * Lists published revisions, oldest first, without their snapshots.
   * @isInt limit
   * @minimum limit 1
   * @maximum limit 100
   */
  @Get()
  @SuccessResponse(200, "Package revisions")
  @Middlewares(allowQueryParameters("limit", "cursor"))
  @Response<ProblemDetails>(400, "Invalid cursor")
  public async listPackageRevisions(
    @Request() request: unknown,
    @Path() eventId: Uuid,
    @Path() packageId: Uuid,
    @Query() limit?: number,
    @Query() cursor?: string,
  ): Promise<PackageRevisionPage> {
    return listRevisions(requestContext(request).principal, eventId, packageId, limit, cursor);
  }

  /** Publishes the current draft. Requires `data-packages.publish`. */
  @Post()
  @SuccessResponse(200, "Published, or the unchanged latest revision")
  @Response<ProblemDetails>(409, "Event archived")
  public async publishDataPackage(
    @Request() request: unknown,
    @Path() eventId: Uuid,
    @Path() packageId: Uuid,
  ): Promise<PublishDataPackageResponse> {
    return publishDataPackage(requestContext(request), eventId, packageId);
  }

  /**
   * Returns one revision with its snapshot.
   * @isInt number
   * @minimum number 1
   */
  @Get("{number}")
  @SuccessResponse(200, "Package revision")
  public async getPackageRevision(
    @Request() request: unknown,
    @Path() eventId: Uuid,
    @Path() packageId: Uuid,
    @Path() number: number,
  ): Promise<PackageRevisionDto> {
    return getRevision(requestContext(request).principal, eventId, packageId, number);
  }
}
