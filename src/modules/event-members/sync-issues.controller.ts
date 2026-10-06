import {
  Body,
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
} from "@tsoa/runtime";
import type { ProblemDetails } from "../../shared/errors/problem.js";
import { allowQueryParameters } from "../../shared/http/query-allowlist.js";
import { requestContext } from "../../shared/http/request-context.js";
import type { Uuid } from "../../shared/http/uuid.js";
import type {
  ExternalMemberSyncResult,
  RetrySyncIssueRequest,
  SyncIssuePage,
  SyncIssueStatus,
} from "./event-member.dto.js";
import { retrySyncIssue } from "./external-member-sync.service.js";
import { listSyncIssues } from "./sync-issues.service.js";

@Route("events/{eventId}/sync-issues")
@Tags("Event members")
@Security("sessionCookie")
@Security("apiClientBearer")
@Response<ProblemDetails>(401, "Authentication required")
@Response<ProblemDetails>(403, "Access denied")
@Response<ProblemDetails>(404, "Not found")
export class SyncIssuesController extends Controller {
  /**
   * Lists synchronizations that could not be resolved, oldest first. Requires `members.read`.
   * @param status Only return issues in this state.
   * @isInt limit
   * @minimum limit 1
   * @maximum limit 100
   */
  @Get()
  @SuccessResponse(200, "Sync issues")
  @Middlewares(allowQueryParameters("limit", "cursor", "status"))
  @Response<ProblemDetails>(400, "Invalid cursor")
  public async listSyncIssues(
    @Request() request: unknown,
    @Path() eventId: Uuid,
    @Query() limit?: number,
    @Query() cursor?: string,
    @Query() status?: SyncIssueStatus,
  ): Promise<SyncIssuePage> {
    return listSyncIssues(requestContext(request).principal, eventId, { limit, cursor, status });
  }

  /**
   * Re-evaluates an open issue against the event's current roles and groups. Requires
   * `members.manage`. A callsign override resolves a callsign conflict for this member.
   */
  @Post("{syncIssueId}/retry")
  @SuccessResponse(200, "Membership resolved or issue still open")
  @Response<ProblemDetails>(409, "Issue not open or event archived")
  public async retrySyncIssue(
    @Request() request: unknown,
    @Path() eventId: Uuid,
    @Path() syncIssueId: Uuid,
    @Body() body: RetrySyncIssueRequest,
  ): Promise<ExternalMemberSyncResult> {
    return retrySyncIssue(requestContext(request), eventId, syncIssueId, body.callsignOverride);
  }
}
