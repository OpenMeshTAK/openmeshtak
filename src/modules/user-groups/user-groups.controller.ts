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
} from "@tsoa/runtime";
import type { ProblemDetails } from "../../shared/errors/problem.js";
import { allowQueryParameters } from "../../shared/http/query-allowlist.js";
import { requestContext } from "../../shared/http/request-context.js";
import type { Uuid } from "../../shared/http/uuid.js";
import type { UserPage } from "../users/user.dto.js";
import {
  addUserGroupMember,
  listUserGroupMembers,
  removeUserGroupMember,
} from "./user-group-members.service.js";
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

  /**
   * Lists the group's members ordered by user creation time, oldest first.
   * @isInt limit
   * @minimum limit 1
   * @maximum limit 100
   */
  @Get("{userGroupId}/members")
  @SuccessResponse(200, "Group members")
  @Middlewares(allowQueryParameters("limit", "cursor"))
  @Response<ProblemDetails>(400, "Invalid cursor")
  @Response<ProblemDetails>(404, "Not found")
  public async listUserGroupMembers(
    @Request() request: unknown,
    @Path() userGroupId: Uuid,
    @Query() limit?: number,
    @Query() cursor?: string,
  ): Promise<UserPage> {
    return listUserGroupMembers(requestContext(request).principal, userGroupId, limit, cursor);
  }

  /**
   * Adds a user to the group. Idempotent. The caller must hold every grant of the group, because
   * membership passes those grants on.
   */
  @Put("{userGroupId}/members/{userId}")
  @SuccessResponse(204, "Member added")
  @Response<ProblemDetails>(404, "Not found")
  public async addUserGroupMember(
    @Request() request: unknown,
    @Path() userGroupId: Uuid,
    @Path() userId: Uuid,
  ): Promise<void> {
    await addUserGroupMember(requestContext(request), userGroupId, userId);
    this.setStatus(204);
  }

  /** Removes a user from the group. A system group always keeps at least one member. */
  @Delete("{userGroupId}/members/{userId}")
  @SuccessResponse(204, "Member removed")
  @Response<ProblemDetails>(404, "Not found")
  @Response<ProblemDetails>(409, "Last member of a system group")
  public async removeUserGroupMember(
    @Request() request: unknown,
    @Path() userGroupId: Uuid,
    @Path() userId: Uuid,
  ): Promise<void> {
    await removeUserGroupMember(requestContext(request), userGroupId, userId);
    this.setStatus(204);
  }
}
