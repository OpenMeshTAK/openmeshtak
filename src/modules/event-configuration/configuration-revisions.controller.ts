import {
  Controller,
  Get,
  Middlewares,
  Path,
  Post,
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
import type {
  ConfigurationRevisionDto,
  ConfigurationRevisionPage,
  PublishConfigurationResponse,
} from "./configuration-revision.dto.js";
import {
  getConfigurationRevision,
  listConfigurationRevisions,
  publishConfiguration,
} from "./configuration-revisions.service.js";

/**
 * Immutable snapshots of an event's roles and group provisioning settings. Activation and
 * reactivation create one automatically; publishing creates one for an active event.
 */
@Route("events/{eventId}/configuration-revisions")
@Tags("Events")
@Security("sessionCookie")
@Security("apiClientBearer")
@Response<ProblemDetails>(401, "Authentication required")
@Response<ProblemDetails>(404, "Not found")
export class ConfigurationRevisionsController extends Controller {
  /**
   * Lists revisions oldest first. Requires `events.read`.
   * @isInt limit
   * @minimum limit 1
   * @maximum limit 100
   */
  @Get()
  @SuccessResponse(200, "Configuration revisions")
  @Middlewares(allowQueryParameters("limit", "cursor"))
  @Response<ProblemDetails>(400, "Invalid cursor")
  public async listConfigurationRevisions(
    @Request() request: unknown,
    @Path() eventId: Uuid,
    @Query() limit?: number,
    @Query() cursor?: string,
  ): Promise<ConfigurationRevisionPage> {
    return listConfigurationRevisions(requestContext(request).principal, eventId, limit, cursor);
  }

  /**
   * Publishes the current configuration of an active event. Returns the latest revision with
   * `created: false` when nothing changed. Requires `events.manage`.
   */
  @Post()
  @SuccessResponse(200, "Configuration published or unchanged")
  @Response<ProblemDetails>(403, "Access denied")
  @Response<ProblemDetails>(409, "Event not active")
  public async publishConfiguration(
    @Request() request: unknown,
    @Path() eventId: Uuid,
  ): Promise<PublishConfigurationResponse> {
    return publishConfiguration(requestContext(request), eventId);
  }

  @Get("{revisionId}")
  @SuccessResponse(200, "Configuration revision")
  public async getConfigurationRevision(
    @Request() request: unknown,
    @Path() eventId: Uuid,
    @Path() revisionId: Uuid,
  ): Promise<ConfigurationRevisionDto> {
    return getConfigurationRevision(requestContext(request).principal, eventId, revisionId);
  }
}
