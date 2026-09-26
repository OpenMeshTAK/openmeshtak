import {
  Body,
  Controller,
  Get,
  Middlewares,
  Post,
  Put,
  Path,
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
import type { UpdateUserRequest, UserDto, UserPage } from "./user.dto.js";
import { getUser, listUsers, revokeUserSessions, sendUserPasswordReset, setUserDisabled, updateUser } from "./users.service.js";

/** Global OpenMeshTak users. Event participation is managed separately per event. */
@Route("users")
@Tags("Users")
@Security("sessionCookie")
@Security("serviceAccountBearer")
@Response<ProblemDetails>(401, "Authentication required")
@Response<ProblemDetails>(403, "Access denied")
export class UsersController extends Controller {
  /**
   * Lists users ordered by creation time, oldest first. Requires instance-wide `users.read`.
   * @isInt limit
   * @minimum limit 1
   * @maximum limit 100
   */
  @Get()
  @SuccessResponse(200, "Users")
  @Middlewares(allowQueryParameters("limit", "cursor", "search"))
  @Response<ProblemDetails>(400, "Invalid cursor")
  public async listUsers(
    @Request() request: unknown,
    @Query() limit?: number,
    @Query() cursor?: string,
    /** Matches part of the display name or email. @maxLength 100 */
    @Query() search?: string,
  ): Promise<UserPage> {
    return listUsers(requestContext(request).principal, limit, cursor, search);
  }

  @Get("{userId}")
  @SuccessResponse(200, "User")
  @Response<ProblemDetails>(404, "Not found")
  public async getUser(@Request() request: unknown, @Path() userId: Uuid): Promise<UserDto> {
    return getUser(requestContext(request).principal, userId);
  }

  /** Renames a user. Requires instance-wide `users.manage`. */
  @Put("{userId}")
  @SuccessResponse(200, "User updated")
  @Response<ProblemDetails>(404, "Not found")
  @Response<ProblemDetails>(409, "Version conflict")
  @Response<ProblemDetails>(422, "Validation failed")
  public async updateUser(@Request() request: unknown, @Path() userId: Uuid, @Body() body: UpdateUserRequest): Promise<UserDto> {
    return updateUser(requestContext(request), userId, body);
  }

  /**
   * Disables a user: all sessions end, and sign-in, access links and TAK connections are refused.
   * Administrators cannot disable themselves. Requires `users.manage`.
   */
  @Post("{userId}/disable")
  @SuccessResponse(200, "User disabled")
  @Response<ProblemDetails>(404, "Not found")
  @Response<ProblemDetails>(409, "Cannot disable yourself")
  public async disableUser(@Request() request: unknown, @Path() userId: Uuid): Promise<UserDto> {
    return setUserDisabled(requestContext(request), userId, true);
  }

  /** Enables a disabled user again. Requires `users.manage`. */
  @Post("{userId}/enable")
  @SuccessResponse(200, "User enabled")
  @Response<ProblemDetails>(404, "Not found")
  public async enableUser(@Request() request: unknown, @Path() userId: Uuid): Promise<UserDto> {
    return setUserDisabled(requestContext(request), userId, false);
  }

  /**
   * Emails the user a single-use password-reset link if their address is verified. Administrators
   * never see or set passwords. Requires `users.manage`.
   */
  @Post("{userId}/password-reset")
  @SuccessResponse(202, "Reset email requested")
  @Response<ProblemDetails>(404, "Not found")
  public async sendUserPasswordReset(@Request() request: unknown, @Path() userId: Uuid): Promise<void> {
    await sendUserPasswordReset(requestContext(request), userId);
    this.setStatus(202);
  }

  /** Signs the user out everywhere. Requires `users.manage`. */
  @Post("{userId}/revoke-sessions")
  @SuccessResponse(204, "Sessions revoked")
  @Response<ProblemDetails>(404, "Not found")
  public async revokeUserSessions(@Request() request: unknown, @Path() userId: Uuid): Promise<void> {
    await revokeUserSessions(requestContext(request), userId);
    this.setStatus(204);
  }
}
