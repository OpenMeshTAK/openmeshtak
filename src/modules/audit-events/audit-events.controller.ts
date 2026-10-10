import { Controller, Get, Middlewares, Path, Query, Request, Response, Route, Security, SuccessResponse, Tags } from "@tsoa/runtime";
import type { ProblemDetails } from "../../shared/errors/problem.js";
import { allowQueryParameters } from "../../shared/http/query-allowlist.js";
import { requestContext } from "../../shared/http/request-context.js";
import type { Uuid } from "../../shared/http/uuid.js";
import type { AuditEventPage, AuditResult, AuditScope } from "./audit-events.dto.js";
import { listAuditEvents, listEventAuditEvents } from "./audit-events.service.js";

const FILTER_PARAMETERS = ["limit", "cursor", "search", "result"];

/** Security-relevant actions: who did what to which target, and whether it succeeded. */
@Route("audit-events")
@Tags("Audit")
@Security("sessionCookie")
@Security("apiClientBearer")
@Response<ProblemDetails>(401, "Authentication required")
@Response<ProblemDetails>(403, "Access denied")
export class AuditEventsController extends Controller {
  /**
   * The audit log, newest first. `eventId` keeps one event's entries; scope `instance` keeps the
   * entries that belong to no event. Requires instance-wide `audit.read`.
   * @isInt limit
   * @minimum limit 1
   * @maximum limit 200
   * @maxLength search 100
   */
  @Get()
  @SuccessResponse(200, "Audit entries")
  @Middlewares(allowQueryParameters(...FILTER_PARAMETERS, "eventId", "scope"))
  @Response<ProblemDetails>(400, "Invalid cursor")
  @Response<ProblemDetails>(422, "Validation failed")
  public async listAuditEvents(
    @Request() request: unknown,
    @Query() limit?: number,
    @Query() cursor?: string,
    /** Part of the action, target type or target ID. */
    @Query() search?: string,
    @Query() result?: AuditResult,
    @Query() eventId?: Uuid,
    @Query() scope?: AuditScope,
  ): Promise<AuditEventPage> {
    this.setHeader("Cache-Control", "no-store");
    return listAuditEvents(requestContext(request).principal, { limit, cursor, search, result, eventId, scope });
  }
}

/** The audit entries of one event, for operators whose `audit.read` covers only that event. */
@Route("events/{eventId}/audit-events")
@Tags("Audit")
@Security("sessionCookie")
@Security("apiClientBearer")
@Response<ProblemDetails>(401, "Authentication required")
@Response<ProblemDetails>(403, "Access denied")
@Response<ProblemDetails>(404, "Not found")
export class EventAuditEventsController extends Controller {
  /**
   * The event's audit entries, newest first. Requires `audit.read` for the event.
   * @isInt limit
   * @minimum limit 1
   * @maximum limit 200
   * @maxLength search 100
   */
  @Get()
  @SuccessResponse(200, "Audit entries")
  @Middlewares(allowQueryParameters(...FILTER_PARAMETERS))
  @Response<ProblemDetails>(400, "Invalid cursor")
  @Response<ProblemDetails>(422, "Validation failed")
  public async listEventAuditEvents(
    @Request() request: unknown,
    @Path() eventId: Uuid,
    @Query() limit?: number,
    @Query() cursor?: string,
    /** Part of the action, target type or target ID. */
    @Query() search?: string,
    @Query() result?: AuditResult,
  ): Promise<AuditEventPage> {
    this.setHeader("Cache-Control", "no-store");
    return listEventAuditEvents(requestContext(request).principal, eventId, { limit, cursor, search, result });
  }
}
