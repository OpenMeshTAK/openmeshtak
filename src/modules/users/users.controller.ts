import {
  Controller,
  Get,
  Middlewares,
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
import type { UserDto, UserPage } from "./user.dto.js";
import { getUser, listUsers } from "./users.service.js";

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
  @Middlewares(allowQueryParameters("limit", "cursor"))
  @Response<ProblemDetails>(400, "Invalid cursor")
  public async listUsers(
    @Request() request: unknown,
    @Query() limit?: number,
    @Query() cursor?: string,
  ): Promise<UserPage> {
    return listUsers(requestContext(request).principal, limit, cursor);
  }

  @Get("{userId}")
  @SuccessResponse(200, "User")
  @Response<ProblemDetails>(404, "Not found")
  public async getUser(@Request() request: unknown, @Path() userId: Uuid): Promise<UserDto> {
    return getUser(requestContext(request).principal, userId);
  }
}
