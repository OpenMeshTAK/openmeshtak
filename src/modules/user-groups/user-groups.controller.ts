import {
  Body,
  Controller,
  Delete,
  Get,
  Middlewares,
  Path,
  Post,
  Put,
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
import type {
  CreateUserGroupRequest,
  UpdateUserGroupRequest,
  UserGroupDto,
  UserGroupPage,
} from "./user-group.dto.js";
import {
  createUserGroup,
  deleteUserGroup,
  getUserGroup,
  listUserGroups,
  updateUserGroup,
} from "./user-groups.service.js";

/**
 * Authorization groups. They are unrelated to tactical event groups. Authorization is managed by
 * people only, so these operations accept the interactive session scheme exclusively.
 */
@Route("user-groups")
@Tags("User groups")
@Security("sessionCookie")
@Response<ProblemDetails>(401, "Authentication required")
@Response<ProblemDetails>(403, "Access denied")
export class UserGroupsController extends Controller {
  /**
   * Lists user groups ordered by creation time, oldest first. Requires `user-groups.read`.
   * @isInt limit
   * @minimum limit 1
   * @maximum limit 100
   */
  @Get()
  @SuccessResponse(200, "User groups")
  @Middlewares(allowQueryParameters("limit", "cursor"))
  @Response<ProblemDetails>(400, "Invalid cursor")
  public async listUserGroups(
    @Request() request: unknown,
    @Query() limit?: number,
    @Query() cursor?: string,
  ): Promise<UserGroupPage> {
    return listUserGroups(requestContext(request).principal, limit, cursor);
  }

  /** Creates a group. Callers can only grant permissions they hold themselves. */
  @Post()
  @SuccessResponse(201, "User group created")
  @Response<ProblemDetails>(409, "Slug already in use")
  @Response<ProblemDetails>(422, "Validation failed")
  public async createUserGroup(
    @Request() request: unknown,
    @Body() body: CreateUserGroupRequest,
  ): Promise<UserGroupDto> {
    const created = await createUserGroup(requestContext(request), body);
    this.setStatus(201);
    return created;
  }

  @Get("{userGroupId}")
  @SuccessResponse(200, "User group")
  @Response<ProblemDetails>(404, "Not found")
  public async getUserGroup(
    @Request() request: unknown,
    @Path() userGroupId: Uuid,
  ): Promise<UserGroupDto> {
    return getUserGroup(requestContext(request).principal, userGroupId);
  }

  /** Replaces name, slug and grants. Requires the current `version`. */
  @Put("{userGroupId}")
  @SuccessResponse(200, "User group updated")
  @Response<ProblemDetails>(404, "Not found")
  @Response<ProblemDetails>(409, "Version conflict, slug conflict or protected system group")
  @Response<ProblemDetails>(422, "Validation failed")
  public async updateUserGroup(
    @Request() request: unknown,
    @Path() userGroupId: Uuid,
    @Body() body: UpdateUserGroupRequest,
  ): Promise<UserGroupDto> {
    return updateUserGroup(requestContext(request), userGroupId, body);
  }

  @Delete("{userGroupId}")
  @SuccessResponse(204, "User group deleted")
  @Response<ProblemDetails>(404, "Not found")
  @Response<ProblemDetails>(409, "Protected system group")
  public async deleteUserGroup(
    @Request() request: unknown,
    @Path() userGroupId: Uuid,
  ): Promise<void> {
    await deleteUserGroup(requestContext(request), userGroupId);
    this.setStatus(204);
  }
}
