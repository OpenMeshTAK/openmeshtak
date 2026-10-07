import { Body, Controller, Get, Path, Post, Put, Request, Response, Route, Security, SuccessResponse, Tags } from "@tsoa/runtime";
import type { ProblemDetails } from "../../shared/errors/problem.js";
import { requestContext } from "../../shared/http/request-context.js";
import type { Uuid } from "../../shared/http/uuid.js";
import type {
  CreatedRegistrationInviteResponse,
  RegistrationInviteDto,
  RegistrationSettingsDto,
  UpdateRegistrationSettingsRequest,
} from "./registration.dto.js";
import { createRegistrationInvite, listRegistrationInvites, revokeRegistrationInvite } from "./registration-invites.service.js";
import { getRegistrationSettings, updateRegistrationSettings } from "./registration-settings.service.js";

@Route("registration-settings")
@Tags("Users")
@Security("sessionCookie")
@Security("apiClientBearer")
@Response<ProblemDetails>(401, "Authentication required")
@Response<ProblemDetails>(403, "Access denied")
export class RegistrationSettingsController extends Controller {
  /** Who may create their own account. Requires `users.manage`. */
  @Get()
  @SuccessResponse(200, "Registration settings")
  public async getRegistrationSettings(@Request() request: unknown): Promise<RegistrationSettingsDto> {
    return getRegistrationSettings(requestContext(request).principal);
  }

  /** Closes registration, makes it invite-only or opens it to everyone. Requires `users.manage`. */
  @Put()
  @SuccessResponse(200, "Registration settings saved")
  @Response<ProblemDetails>(409, "Version conflict")
  @Response<ProblemDetails>(422, "Validation failed")
  public async updateRegistrationSettings(
    @Request() request: unknown,
    @Body() body: UpdateRegistrationSettingsRequest,
  ): Promise<RegistrationSettingsDto> {
    return updateRegistrationSettings(requestContext(request), body);
  }
}

@Route("registration-invites")
@Tags("Users")
@Security("sessionCookie")
@Security("apiClientBearer")
@Response<ProblemDetails>(401, "Authentication required")
@Response<ProblemDetails>(403, "Access denied")
export class RegistrationInvitesController extends Controller {
  /** The 50 most recent registration invites, newest first. Requires `users.manage`. */
  @Get()
  @SuccessResponse(200, "Registration invites")
  public async listRegistrationInvites(@Request() request: unknown): Promise<RegistrationInviteDto[]> {
    return listRegistrationInvites(requestContext(request).principal);
  }

  /**
   * Issues a single-use registration link, valid for seven days, for invite-only registration.
   * The link is returned once. Requires `users.manage`.
   */
  @Post()
  @SuccessResponse(201, "Registration invite created")
  public async createRegistrationInvite(@Request() request: unknown): Promise<CreatedRegistrationInviteResponse> {
    const created = await createRegistrationInvite(requestContext(request));
    this.setStatus(201);
    return created;
  }

  /** Revokes an unused invite immediately. Requires `users.manage`. */
  @Post("{inviteId}/revoke")
  @SuccessResponse(200, "Registration invite revoked")
  @Response<ProblemDetails>(404, "Not found")
  public async revokeRegistrationInvite(@Request() request: unknown, @Path() inviteId: Uuid): Promise<RegistrationInviteDto> {
    return revokeRegistrationInvite(requestContext(request), inviteId);
  }
}
