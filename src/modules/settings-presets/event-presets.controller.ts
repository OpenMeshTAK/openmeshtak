import { Body, Controller, Get, Middlewares, Path, Post, Request, Response, Route, Security, SuccessResponse, Tags } from "@tsoa/runtime";
import type { ProblemDetails } from "../../shared/errors/problem.js";
import { issuanceRateLimit } from "../../shared/http/issuance-rate-limit.js";
import { requestContext } from "../../shared/http/request-context.js";
import type { Uuid } from "../../shared/http/uuid.js";
import type { MeshtasticConfigurationDto } from "../meshtastic-configuration/meshtastic-configuration.dto.js";
import type { AtakPreferenceListDto } from "../tak-configuration/atak-preference-list.dto.js";
import {
  applyMeshtasticPreset,
  applyTakPreset,
  exportMeshtasticPreset,
  exportTakPreset,
  previewMeshtasticPreset,
  previewTakPreset,
} from "./event-presets.service.js";
import type {
  ApplyMeshtasticPresetRequest,
  ApplyTakPresetRequest,
  MeshtasticPresetPreviewDto,
  PresetDocumentDto,
  PreviewMeshtasticPresetRequest,
  PreviewTakPresetRequest,
  TakPresetPreviewDto,
} from "./settings-presets.dto.js";

/** Imports are validated in full on every call; the limit only stops scripted bulk use. */
const presetImportRateLimit = issuanceRateLimit(300, "preset imports");

/**
 * Exports an event's Meshtastic settings as a portable preset and imports one into the event's
 * draft after a preview. Exports need `events.read`, imports `events.manage`. Imports never change
 * secrets or the firmware version and never publish.
 */
@Route("events/{eventId}/meshtastic/preset")
@Tags("Settings presets")
@Security("sessionCookie")
@Security("apiClientBearer")
@Response<ProblemDetails>(401, "Authentication required")
@Response<ProblemDetails>(404, "Not found")
export class MeshtasticPresetController extends Controller {
  /** The event's Meshtastic settings without secrets, managed or member-specific values. */
  @Get()
  @SuccessResponse(200, "Meshtastic preset")
  public async exportMeshtasticPreset(@Request() request: unknown, @Path() eventId: Uuid): Promise<PresetDocumentDto> {
    return exportMeshtasticPreset(requestContext(request).principal, eventId);
  }

  /** Checks a preset against the event's firmware profile and reports what an import would change. */
  @Post("preview")
  @Middlewares(presetImportRateLimit)
  @SuccessResponse(200, "Import preview")
  @Response<ProblemDetails>(403, "Access denied")
  @Response<ProblemDetails>(409, "Event archived")
  @Response<ProblemDetails>(422, "Invalid preset")
  public async previewMeshtasticPreset(
    @Request() request: unknown,
    @Path() eventId: Uuid,
    @Body() body: PreviewMeshtasticPresetRequest,
  ): Promise<MeshtasticPresetPreviewDto> {
    return previewMeshtasticPreset(requestContext(request).principal, eventId, body);
  }

  /** Applies a previewed preset to the draft. Send the preview's `version` and `confirmation`. */
  @Post("import")
  @Middlewares(presetImportRateLimit)
  @SuccessResponse(200, "Preset imported into the draft")
  @Response<ProblemDetails>(403, "Access denied")
  @Response<ProblemDetails>(409, "Version conflict, unconfirmed import or event archived")
  @Response<ProblemDetails>(422, "Invalid preset")
  public async importMeshtasticPreset(
    @Request() request: unknown,
    @Path() eventId: Uuid,
    @Body() body: ApplyMeshtasticPresetRequest,
  ): Promise<MeshtasticConfigurationDto> {
    return applyMeshtasticPreset(requestContext(request), eventId, body);
  }
}

/**
 * Exports an event's ATAK preferences as a portable preset and imports one into the event's draft
 * after a preview. Group and role entries need an explicit mapping onto the target event;
 * member-specific entries are never exported. Exports need `events.read`, imports `events.manage`.
 */
@Route("events/{eventId}/tak/preset")
@Tags("Settings presets")
@Security("sessionCookie")
@Security("apiClientBearer")
@Response<ProblemDetails>(401, "Authentication required")
@Response<ProblemDetails>(404, "Not found")
export class TakPresetController extends Controller {
  /** The event's ATAK preferences for the whole event, its groups and roles. */
  @Get()
  @SuccessResponse(200, "TAK preset")
  public async exportTakPreset(@Request() request: unknown, @Path() eventId: Uuid): Promise<PresetDocumentDto> {
    return exportTakPreset(requestContext(request).principal, eventId);
  }

  /**
   * Checks a preset against the ATAK catalog and the event, and reports what an import would add or
   * change. `confirmation` stays `null` until every group and role of the preset is mapped.
   */
  @Post("preview")
  @Middlewares(presetImportRateLimit)
  @SuccessResponse(200, "Import preview")
  @Response<ProblemDetails>(403, "Access denied")
  @Response<ProblemDetails>(409, "Event archived")
  @Response<ProblemDetails>(422, "Invalid preset or mapping")
  public async previewTakPreset(@Request() request: unknown, @Path() eventId: Uuid, @Body() body: PreviewTakPresetRequest): Promise<TakPresetPreviewDto> {
    return previewTakPreset(requestContext(request).principal, eventId, body);
  }

  /** Merges a previewed preset into the draft. Send the preview's `version`, mappings and `confirmation`. */
  @Post("import")
  @Middlewares(presetImportRateLimit)
  @SuccessResponse(200, "Preset imported into the draft")
  @Response<ProblemDetails>(403, "Access denied")
  @Response<ProblemDetails>(409, "Version conflict, unconfirmed import or event archived")
  @Response<ProblemDetails>(422, "Invalid preset or mapping")
  public async importTakPreset(@Request() request: unknown, @Path() eventId: Uuid, @Body() body: ApplyTakPresetRequest): Promise<AtakPreferenceListDto> {
    return applyTakPreset(requestContext(request), eventId, body);
  }
}
