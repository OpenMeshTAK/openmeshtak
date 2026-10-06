import {
  Controller,
  Get,
  Middlewares,
  Path,
  Post,
  Request,
  Response,
  Route,
  Security,
  SuccessResponse,
  Tags,
} from "@tsoa/runtime";
import type { ProblemDetails } from "../../shared/errors/problem.js";
import { preventCaching, requestContext } from "../../shared/http/request-context.js";
import { issuanceRateLimit } from "../../shared/http/issuance-rate-limit.js";
import type { Uuid } from "../../shared/http/uuid.js";
import type { CreatedMemberClaimResponse, MemberClaimDto } from "./member-claim.dto.js";
import { createMemberClaim, listMemberClaims, revokeMemberClaim } from "./member-claims.service.js";

const claimIssuanceRateLimit = issuanceRateLimit(200, "access links");

@Route("events/{eventId}/members/{memberId}/claims")
@Tags("Event members")
@Security("sessionCookie")
@Security("apiClientBearer")
@Response<ProblemDetails>(401, "Authentication required")
@Response<ProblemDetails>(403, "Access denied")
@Response<ProblemDetails>(404, "Not found")
export class MemberClaimsController extends Controller {
  /** Lists the member's 20 most recent claims without their tokens. Requires `members.read`. */
  @Get()
  @SuccessResponse(200, "Claims")
  public async listMemberClaims(
    @Request() request: unknown,
    @Path() eventId: Uuid,
    @Path() memberId: Uuid,
  ): Promise<MemberClaimDto[]> {
    return listMemberClaims(requestContext(request).principal, eventId, memberId);
  }

  /**
   * Issues a 24-hour single-use claim and returns its token exactly once. Earlier open claims of
   * the member are revoked. Requires `member-claims.create` and an active event.
   */
  @Post()
  @Middlewares(claimIssuanceRateLimit)
  @SuccessResponse(201, "Claim created")
  @Response<ProblemDetails>(409, "Event not active")
  @Response<ProblemDetails>(429, "Too many new access links")
  public async createMemberClaim(
    @Request() request: unknown,
    @Path() eventId: Uuid,
    @Path() memberId: Uuid,
  ): Promise<CreatedMemberClaimResponse> {
    const context = requestContext(request);
    preventCaching(context);
    const created = await createMemberClaim(context, eventId, memberId);
    this.setStatus(201);
    return created;
  }

  /** Revokes an open claim immediately. Repeating the request is harmless. */
  @Post("{claimId}/revoke")
  @SuccessResponse(200, "Claim revoked")
  public async revokeMemberClaim(
    @Request() request: unknown,
    @Path() eventId: Uuid,
    @Path() memberId: Uuid,
    @Path() claimId: Uuid,
  ): Promise<MemberClaimDto> {
    return revokeMemberClaim(requestContext(request), eventId, memberId, claimId);
  }
}
