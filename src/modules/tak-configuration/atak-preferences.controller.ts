import { Body, Controller, Get, Path, Post, Put, Request, Response, Route, Security, SuccessResponse, Tags } from "@tsoa/runtime";
import type { ProblemDetails } from "../../shared/errors/problem.js";
import { requestContext } from "../../shared/http/request-context.js";
import type { Uuid } from "../../shared/http/uuid.js";
import type {
  AtakPreferenceCatalogDto,
  AtakPreferenceListDto,
  ImportAtakPreferencesRequest,
  ImportAtakPreferencesResponse,
  ReplaceAtakPreferencesRequest,
} from "./atak-preference-list.dto.js";
import {
  getAtakPreferenceCatalog,
  getAtakPreferences,
  importAtakPreferences,
  replaceAtakPreferences,
} from "./atak-preference-list.service.js";

/**
 * The ATAK preferences an event sends to its members' apps, each for the whole event or one event
 * group, role or member. Reads need `events.read`, changes `events.manage`; changes reach members
 * through a published configuration revision.
 */
@Route("events/{eventId}/tak/atak-preferences")
@Tags("TAK configuration")
@Security("sessionCookie")
@Security("apiClientBearer")
@Response<ProblemDetails>(401, "Authentication required")
@Response<ProblemDetails>(404, "Not found")
export class AtakPreferencesController extends Controller {
  @Get()
  @SuccessResponse(200, "ATAK preferences")
  public async getAtakPreferences(@Request() request: unknown, @Path() eventId: Uuid): Promise<AtakPreferenceListDto> {
    return getAtakPreferences(requestContext(request).principal, eventId);
  }

  /** Replaces the whole list. Requires the current `version` (0 before the first save). */
  @Put()
  @SuccessResponse(200, "ATAK preferences replaced")
  @Response<ProblemDetails>(403, "Access denied")
  @Response<ProblemDetails>(409, "Version conflict or event archived")
  @Response<ProblemDetails>(422, "Validation failed")
  public async replaceAtakPreferences(
    @Request() request: unknown,
    @Path() eventId: Uuid,
    @Body() body: ReplaceAtakPreferencesRequest,
  ): Promise<AtakPreferenceListDto> {
    return replaceAtakPreferences(requestContext(request), eventId, body);
  }

  /**
   * Imports a `.pref` file, such as ATAK's settings export, as event-wide entries. Keys
   * OpenMeshTak owns and entries that do not fit ATAK's types are left out and listed.
   */
  @Post("import")
  @SuccessResponse(200, "ATAK preferences imported")
  @Response<ProblemDetails>(403, "Access denied")
  @Response<ProblemDetails>(409, "Version conflict or event archived")
  @Response<ProblemDetails>(422, "Validation failed")
  public async importAtakPreferences(
    @Request() request: unknown,
    @Path() eventId: Uuid,
    @Body() body: ImportAtakPreferencesRequest,
  ): Promise<ImportAtakPreferencesResponse> {
    return importAtakPreferences(requestContext(request), eventId, body);
  }
}

/** ATAK preference keys this Core release knows, by topic. Requires `events.read` for at least one event. */
@Route("tak/atak-preference-catalog")
@Tags("TAK configuration")
@Security("sessionCookie")
@Security("apiClientBearer")
@Response<ProblemDetails>(401, "Authentication required")
@Response<ProblemDetails>(403, "Access denied")
export class AtakPreferenceCatalogController extends Controller {
  @Get()
  @SuccessResponse(200, "ATAK preference catalog")
  public async getAtakPreferenceCatalog(@Request() request: unknown): Promise<AtakPreferenceCatalogDto> {
    return getAtakPreferenceCatalog(requestContext(request).principal);
  }
}
