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
import { issuanceRateLimit } from "../../shared/http/issuance-rate-limit.js";
import { allowQueryParameters } from "../../shared/http/query-allowlist.js";
import { requestContext } from "../../shared/http/request-context.js";
import type { Uuid } from "../../shared/http/uuid.js";
import {
  createSettingsPreset,
  deleteSettingsPreset,
  getSettingsPreset,
  listSettingsPresets,
  updateSettingsPreset,
} from "./preset-library.service.js";
import type {
  CreateSettingsPresetRequest,
  PresetKind,
  SettingsPresetDto,
  SettingsPresetPage,
  UpdateSettingsPresetRequest,
} from "./settings-presets.dto.js";

const presetSaveRateLimit = issuanceRateLimit(300, "presets");

/**
 * The global library of reusable TAK and Meshtastic presets. Applying a preset copies its values
 * into one event's draft, so editing or deleting a library preset never changes an event. Reading
 * needs `events.manage` for at least one event; changes need `events.manage` for every event.
 */
@Route("presets")
@Tags("Settings presets")
@Security("sessionCookie")
@Security("apiClientBearer")
@Response<ProblemDetails>(401, "Authentication required")
@Response<ProblemDetails>(403, "Access denied")
export class PresetLibraryController extends Controller {
  /**
   * Lists library presets ordered by creation time, oldest first.
   * @isInt limit
   * @minimum limit 1
   * @maximum limit 100
   */
  @Get()
  @SuccessResponse(200, "Presets")
  @Middlewares(allowQueryParameters("kind", "limit", "cursor"))
  @Response<ProblemDetails>(400, "Invalid cursor")
  public async listSettingsPresets(
    @Request() request: unknown,
    @Query() kind?: PresetKind,
    @Query() limit?: number,
    @Query() cursor?: string,
  ): Promise<SettingsPresetPage> {
    return listSettingsPresets(requestContext(request).principal, kind, limit, cursor);
  }

  /** Validates a preset document without an event and saves a copy to the library. */
  @Post()
  @Middlewares(presetSaveRateLimit)
  @SuccessResponse(201, "Preset saved")
  @Response<ProblemDetails>(422, "Invalid preset")
  public async createSettingsPreset(@Request() request: unknown, @Body() body: CreateSettingsPresetRequest): Promise<SettingsPresetDto> {
    const created = await createSettingsPreset(requestContext(request), body);
    this.setStatus(201);
    return created;
  }

  /** The preset with its portable document, ready to download or import into an event. */
  @Get("{presetId}")
  @SuccessResponse(200, "Preset")
  @Response<ProblemDetails>(404, "Not found")
  public async getSettingsPreset(@Request() request: unknown, @Path() presetId: Uuid): Promise<SettingsPresetDto> {
    return getSettingsPreset(requestContext(request).principal, presetId);
  }

  /** Renames the preset or replaces its settings. Requires the current `version`. */
  @Put("{presetId}")
  @Middlewares(presetSaveRateLimit)
  @SuccessResponse(200, "Preset updated")
  @Response<ProblemDetails>(404, "Not found")
  @Response<ProblemDetails>(409, "Version conflict")
  @Response<ProblemDetails>(422, "Invalid preset")
  public async updateSettingsPreset(
    @Request() request: unknown,
    @Path() presetId: Uuid,
    @Body() body: UpdateSettingsPresetRequest,
  ): Promise<SettingsPresetDto> {
    return updateSettingsPreset(requestContext(request), presetId, body);
  }

  /** Deletes the preset. Events that used it keep their values. */
  @Delete("{presetId}")
  @SuccessResponse(204, "Preset deleted")
  @Response<ProblemDetails>(404, "Not found")
  public async deleteSettingsPreset(@Request() request: unknown, @Path() presetId: Uuid): Promise<void> {
    await deleteSettingsPreset(requestContext(request), presetId);
    this.setStatus(204);
  }
}
