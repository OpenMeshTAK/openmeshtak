import { Controller, Get, Middlewares, Path, Query, Request, Response, Route, Security, SuccessResponse, Tags } from "@tsoa/runtime";
import type { ProblemDetails } from "../../shared/errors/problem.js";
import { requestContext } from "../../shared/http/request-context.js";
import { allowQueryParameters } from "../../shared/http/query-allowlist.js";
import type { Uuid } from "../../shared/http/uuid.js";
import { database } from "../../shared/database/database.js";
import { requireDataPackage } from "./data-package-access.js";
import { buildPackageSnapshot } from "./package-snapshot.js";
import { exportedSnapshot, findRevision } from "./package-import.service.js";
import { presentationLosses, type PresentationReport } from "./export-presentation.js";

@Route("events/{eventId}/data-packages/{packageId}")
@Tags("Data packages")
@Security("sessionCookie")
@Security("apiClientBearer")
@Response<ProblemDetails>(401, "Authentication required")
@Response<ProblemDetails>(403, "Access denied")
@Response<ProblemDetails>(404, "Not found")
export class PackagePresentationController extends Controller {
  /** Reports source-confirmed presentation differences before downloading an export.
   * Omit revision for the current draft. This is not a real-client acceptance result.
   * @isInt revision
   * @minimum revision 1
   */
  @Get("presentation-report")
  @Middlewares(allowQueryParameters("format", "revision", "layerId"))
  @SuccessResponse(200, "Presentation differences")
  public async report(@Request() request: unknown, @Path() eventId: Uuid, @Path() packageId: Uuid,
    @Query() format: "cot" | "kml", @Query() revision?: number, @Query() layerId?: Uuid): Promise<PresentationReport> {
    await requireDataPackage(requestContext(request).principal, eventId, packageId, "data-packages.read");
    const source = revision === undefined ? await buildPackageSnapshot(database, packageId) : (await findRevision(packageId, revision)).snapshot;
    const snapshot = exportedSnapshot(source as Awaited<ReturnType<typeof buildPackageSnapshot>>, layerId);
    return { format, losses: snapshot.objects.flatMap((object) => presentationLosses(object, format)) };
  }
}
