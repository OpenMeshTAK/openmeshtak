import {
  Body,
  Controller,
  Delete,
  Get,
  Header,
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
import { idempotent } from "../../shared/http/idempotency.js";
import { allowQueryParameters } from "../../shared/http/query-allowlist.js";
import { requestContext } from "../../shared/http/request-context.js";
import type { Uuid } from "../../shared/http/uuid.js";
import type {
  CreatedEventMemberAccountResponse,
  CreateEventMemberAccountRequest,
  CreateEventMemberRequest,
  EventMemberDto,
  EventMemberPage,
  UpdateEventMemberRequest,
} from "./event-member.dto.js";
import {
  createEventMember,
  createEventMemberAccount,
  deleteEventMember,
  getEventMember,
  listEventMembers,
  updateEventMember,
} from "./event-members.service.js";

@Route("events/{eventId}/members")
@Tags("Event members")
@Security("sessionCookie")
@Security("apiClientBearer")
@Response<ProblemDetails>(401, "Authentication required")
@Response<ProblemDetails>(403, "Access denied")
@Response<ProblemDetails>(404, "Not found")
export class EventMembersController extends Controller {
  /**
   * Lists the event's members ordered by creation time, oldest first. Requires `members.read`.
   * @isInt limit
   * @minimum limit 1
   * @maximum limit 100
   */
  @Get()
  @SuccessResponse(200, "Event members")
  @Middlewares(allowQueryParameters("limit", "cursor"))
  @Response<ProblemDetails>(400, "Invalid cursor")
  public async listEventMembers(
    @Request() request: unknown,
    @Path() eventId: Uuid,
    @Query() limit?: number,
    @Query() cursor?: string,
  ): Promise<EventMemberPage> {
    return listEventMembers(requestContext(request).principal, eventId, limit, cursor);
  }

  /**
   * Adds an existing OpenMeshTak user to the event. Members from external systems use the
   * external-member upsert instead. Requires `members.manage`.
   * @param _idempotencyKey Makes retries safe: a repeated request returns the original response.
   */
  @Post()
  @Middlewares(idempotent)
  @SuccessResponse(201, "Event member created")
  @Response<ProblemDetails>(409, "Already a member, callsign or short-name conflict, or event archived; Idempotency-Key conflict")
  @Response<ProblemDetails>(422, "Validation failed")
  public async createEventMember(
    @Request() request: unknown,
    @Path() eventId: Uuid,
    @Body() body: CreateEventMemberRequest,
    @Header("Idempotency-Key") _idempotencyKey?: string,
  ): Promise<EventMemberDto> {
    const created = await createEventMember(requestContext(request), eventId, body);
    this.setStatus(201);
    return created;
  }

  /**
   * Creates a new person and adds them to the event in one step. Returns a single-use setup link,
   * valid for seven days, so they choose their own password. The account is an event account that
   * is deleted when the event is archived, unless the event keeps its accounts
   * (`permanentAccounts`). Requires `member-accounts.create`.
   */
  @Post("accounts")
  @SuccessResponse(201, "Account and member created")
  @Response<ProblemDetails>(409, "Username taken, callsign or short-name conflict, or event archived")
  @Response<ProblemDetails>(422, "Validation failed")
  public async createEventMemberAccount(
    @Request() request: unknown,
    @Path() eventId: Uuid,
    @Body() body: CreateEventMemberAccountRequest,
  ): Promise<CreatedEventMemberAccountResponse> {
    const created = await createEventMemberAccount(requestContext(request), eventId, body);
    this.setStatus(201);
    return created;
  }

  @Get("{memberId}")
  @SuccessResponse(200, "Event member")
  public async getEventMember(
    @Request() request: unknown,
    @Path() eventId: Uuid,
    @Path() memberId: Uuid,
  ): Promise<EventMemberDto> {
    return getEventMember(requestContext(request).principal, eventId, memberId);
  }

  /**
   * Replaces the member's event role, event group and callsign override. Requires the current
   * `version` and `members.manage`. An integration sync may later set role and group again.
   */
  @Put("{memberId}")
  @SuccessResponse(200, "Event member updated")
  @Response<ProblemDetails>(409, "Version conflict, callsign or short-name conflict, or event archived")
  @Response<ProblemDetails>(422, "Validation failed")
  public async updateEventMember(
    @Request() request: unknown,
    @Path() eventId: Uuid,
    @Path() memberId: Uuid,
    @Body() body: UpdateEventMemberRequest,
  ): Promise<EventMemberDto> {
    return updateEventMember(requestContext(request), eventId, memberId, body);
  }

  /**
   * Removes the member from this event only. The user and other event participations remain.
   * Requires `members.manage`.
   */
  @Delete("{memberId}")
  @SuccessResponse(204, "Event member removed")
  @Response<ProblemDetails>(409, "Event archived")
  public async deleteEventMember(
    @Request() request: unknown,
    @Path() eventId: Uuid,
    @Path() memberId: Uuid,
  ): Promise<void> {
    await deleteEventMember(requestContext(request), eventId, memberId);
    this.setStatus(204);
  }
}
