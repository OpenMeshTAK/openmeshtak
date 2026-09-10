import {
  Body,
  Controller,
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
  CreateEventRequest,
  EventDto,
  EventPage,
  EventStatus,
  EventTransitionRequest,
  UpdateEventRequest,
} from "./event.dto.js";
import { transitionEvent } from "./event-lifecycle.service.js";
import { createEvent, getEvent, listEvents, updateEvent } from "./events.service.js";

/**
 * Events are administered by people and by scoped integrations; every operation is authorized
 * against the caller's `events.*` grants for the specific event.
 */
@Route("events")
@Tags("Events")
@Security("sessionCookie")
@Security("serviceAccountBearer")
@Response<ProblemDetails>(401, "Authentication required")
export class EventsController extends Controller {
  /**
   * Lists the events the caller may read, ordered by creation time, oldest first.
   * @param status Only return events in this lifecycle state.
   * @isInt limit
   * @minimum limit 1
   * @maximum limit 100
   */
  @Get()
  @SuccessResponse(200, "Events")
  @Middlewares(allowQueryParameters("limit", "cursor", "status"))
  @Response<ProblemDetails>(400, "Invalid cursor")
  @Response<ProblemDetails>(422, "Validation failed")
  public async listEvents(
    @Request() request: unknown,
    @Query() limit?: number,
    @Query() cursor?: string,
    @Query() status?: EventStatus,
  ): Promise<EventPage> {
    return listEvents(requestContext(request).principal, { limit, cursor, status });
  }

  /** Creates a new event in the `draft` state. Requires instance-wide `events.manage`. */
  @Post()
  @SuccessResponse(201, "Event created")
  @Response<ProblemDetails>(403, "Access denied")
  @Response<ProblemDetails>(409, "Slug already in use")
  @Response<ProblemDetails>(422, "Validation failed")
  public async createEvent(
    @Request() request: unknown,
    @Body() body: CreateEventRequest,
  ): Promise<EventDto> {
    const created = await createEvent(requestContext(request), body);
    this.setStatus(201);
    return created;
  }

  @Get("{eventId}")
  @SuccessResponse(200, "Event")
  @Response<ProblemDetails>(404, "Not found")
  public async getEvent(@Request() request: unknown, @Path() eventId: Uuid): Promise<EventDto> {
    return getEvent(requestContext(request).principal, eventId);
  }

  /**
   * Replaces the editable event settings. Requires the current `version`. The lifecycle state is
   * changed only through dedicated transitions, and archived events are read-only.
   */
  @Put("{eventId}")
  @SuccessResponse(200, "Event updated")
  @Response<ProblemDetails>(403, "Access denied")
  @Response<ProblemDetails>(404, "Not found")
  @Response<ProblemDetails>(409, "Version conflict, slug conflict or archived event")
  @Response<ProblemDetails>(422, "Validation failed")
  public async updateEvent(
    @Request() request: unknown,
    @Path() eventId: Uuid,
    @Body() body: UpdateEventRequest,
  ): Promise<EventDto> {
    return updateEvent(requestContext(request), eventId, body);
  }

  /**
   * Moves a draft event to `active`. Requires `events.manage` and at least one event role and
   * one event group; unmet requirements are listed in the problem's `errors`.
   */
  @Post("{eventId}/activate")
  @SuccessResponse(200, "Event activated")
  @Response<ProblemDetails>(403, "Access denied")
  @Response<ProblemDetails>(404, "Not found")
  @Response<ProblemDetails>(409, "Version conflict, invalid transition or event not ready")
  public async activateEvent(
    @Request() request: unknown,
    @Path() eventId: Uuid,
    @Body() body: EventTransitionRequest,
  ): Promise<EventDto> {
    return transitionEvent(requestContext(request), eventId, "activate", body.version);
  }

  /** Moves an active event to the read-only `archived` state. Requires `events.manage`. */
  @Post("{eventId}/archive")
  @SuccessResponse(200, "Event archived")
  @Response<ProblemDetails>(403, "Access denied")
  @Response<ProblemDetails>(404, "Not found")
  @Response<ProblemDetails>(409, "Version conflict or invalid transition")
  public async archiveEvent(
    @Request() request: unknown,
    @Path() eventId: Uuid,
    @Body() body: EventTransitionRequest,
  ): Promise<EventDto> {
    return transitionEvent(requestContext(request), eventId, "archive", body.version);
  }

  /**
   * Returns an archived event to `active` after repeating activation validation. Requires
   * `events.reactivate`. Revoked or expired credentials, artifacts and download grants stay
   * invalid; clients regenerate what they need.
   */
  @Post("{eventId}/reactivate")
  @SuccessResponse(200, "Event reactivated")
  @Response<ProblemDetails>(403, "Access denied")
  @Response<ProblemDetails>(404, "Not found")
  @Response<ProblemDetails>(409, "Version conflict, invalid transition or event not ready")
  public async reactivateEvent(
    @Request() request: unknown,
    @Path() eventId: Uuid,
    @Body() body: EventTransitionRequest,
  ): Promise<EventDto> {
    return transitionEvent(requestContext(request), eventId, "reactivate", body.version);
  }
}
