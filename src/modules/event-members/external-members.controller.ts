import {
  Body,
  Controller,
  Path,
  Put,
  Request,
  Response,
  Route,
  Security,
  SuccessResponse,
  Tags,
} from "tsoa";
import type { ProblemDetails } from "../../shared/errors/problem.js";
import { requestContext } from "../../shared/http/request-context.js";
import type { Uuid } from "../../shared/http/uuid.js";
import type {
  ExternalId,
  ExternalMemberSyncRequest,
  ExternalMemberSyncResult,
  ExternalProvider,
} from "./event-member.dto.js";
import { syncExternalMember } from "./external-member-sync.service.js";

@Route("events/{eventId}/external-members")
@Tags("Event members")
@Security("sessionCookie")
@Security("apiClientBearer")
@Response<ProblemDetails>(401, "Authentication required")
@Response<ProblemDetails>(403, "Access denied")
@Response<ProblemDetails>(404, "Not found")
export class ExternalMembersController extends Controller {
  /**
   * Idempotently creates or updates the event membership of an external identity. Requires
   * `members.sync` for the event. When the role or group slug does not exist, the response
   * contains a sync issue instead and nothing else changes. Synchronization never creates a
   * password, login, email address or session.
   */
  @Put("{provider}/{externalId}")
  @SuccessResponse(200, "Membership resolved or sync issue recorded")
  @Response<ProblemDetails>(409, "Event archived")
  @Response<ProblemDetails>(422, "Validation failed")
  public async syncExternalMember(
    @Request() request: unknown,
    @Path() eventId: Uuid,
    @Path() provider: ExternalProvider,
    @Path() externalId: ExternalId,
    @Body() body: ExternalMemberSyncRequest,
  ): Promise<ExternalMemberSyncResult> {
    return syncExternalMember(requestContext(request), eventId, { provider, externalId }, body);
  }
}
