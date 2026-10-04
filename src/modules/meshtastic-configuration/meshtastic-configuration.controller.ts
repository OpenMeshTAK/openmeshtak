import {
  Body,
  Controller,
  Get,
  Path,
  Post,
  Put,
  Request,
  Response,
  Route,
  Security,
  SuccessResponse,
  Tags,
} from "tsoa";
import type { ProblemDetails } from "../../shared/errors/problem.js";
import { requestContext } from "../../shared/http/request-context.js";
import type { Uuid } from "../../shared/http/uuid.js";
import type {
  ChangeFirmwareRequest,
  FirmwareChangePreviewDto,
  MeshtasticConfigurationDto,
  PreviewFirmwareChangeRequest,
  UpdateMeshtasticSecretsRequest,
  UpdateMeshtasticSettingsRequest,
} from "./meshtastic-configuration.dto.js";
import {
  changeFirmware,
  getMeshtasticConfiguration,
  previewFirmwareChange,
  updateMeshtasticSecrets,
  updateMeshtasticSettings,
} from "./meshtastic-configuration.service.js";

/**
 * The event's recommended Meshtastic firmware and radio settings, validated against the matching
 * firmware profile. Changes reach participants through a published configuration revision. Reads
 * need `events.read`, changes `events.manage`.
 */
@Route("events/{eventId}/meshtastic/configuration")
@Tags("Meshtastic configuration")
@Security("sessionCookie")
@Security("apiClientBearer")
@Response<ProblemDetails>(401, "Authentication required")
@Response<ProblemDetails>(404, "Not found")
export class MeshtasticConfigurationController extends Controller {
  @Get()
  @SuccessResponse(200, "Meshtastic configuration")
  public async getMeshtasticConfiguration(
    @Request() request: unknown,
    @Path() eventId: Uuid,
  ): Promise<MeshtasticConfigurationDto> {
    return getMeshtasticConfiguration(requestContext(request).principal, eventId);
  }

  /** Replaces the settings for the current firmware version. Requires the current `version`. */
  @Put("settings")
  @SuccessResponse(200, "Settings updated")
  @Response<ProblemDetails>(403, "Access denied")
  @Response<ProblemDetails>(409, "Version conflict or event archived")
  @Response<ProblemDetails>(422, "Validation failed")
  public async updateMeshtasticSettings(
    @Request() request: unknown,
    @Path() eventId: Uuid,
    @Body() body: UpdateMeshtasticSettingsRequest,
  ): Promise<MeshtasticConfigurationDto> {
    return updateMeshtasticSettings(requestContext(request), eventId, body);
  }

  /**
   * Sets or clears write-only secrets such as the Wi-Fi or MQTT password. Values are never
   * returned; `secretsSet` only says which secrets hold a value. Requires the current `version`.
   */
  @Put("secrets")
  @SuccessResponse(200, "Secrets updated")
  @Response<ProblemDetails>(403, "Access denied")
  @Response<ProblemDetails>(409, "Version conflict or event archived")
  @Response<ProblemDetails>(422, "Validation failed")
  public async updateMeshtasticSecrets(
    @Request() request: unknown,
    @Path() eventId: Uuid,
    @Body() body: UpdateMeshtasticSecretsRequest,
  ): Promise<MeshtasticConfigurationDto> {
    return updateMeshtasticSecrets(requestContext(request), eventId, body);
  }

  /** Reports which settings a firmware change would keep, drop, invalidate or add. */
  @Post("firmware/preview")
  @SuccessResponse(200, "Firmware change preview")
  @Response<ProblemDetails>(403, "Access denied")
  @Response<ProblemDetails>(409, "Event archived")
  @Response<ProblemDetails>(422, "Unsupported firmware version")
  public async previewFirmwareChange(
    @Request() request: unknown,
    @Path() eventId: Uuid,
    @Body() body: PreviewFirmwareChangeRequest,
  ): Promise<FirmwareChangePreviewDto> {
    return previewFirmwareChange(requestContext(request).principal, eventId, body);
  }

  /**
   * Changes the recommended firmware. Except for raising the minimum patch within a line, send
   * the `confirmation` of the preview that was accepted.
   */
  @Put("firmware")
  @SuccessResponse(200, "Firmware changed")
  @Response<ProblemDetails>(403, "Access denied")
  @Response<ProblemDetails>(409, "Version conflict, unconfirmed change or event archived")
  @Response<ProblemDetails>(422, "Unsupported firmware version")
  public async changeFirmware(
    @Request() request: unknown,
    @Path() eventId: Uuid,
    @Body() body: ChangeFirmwareRequest,
  ): Promise<MeshtasticConfigurationDto> {
    return changeFirmware(requestContext(request), eventId, body);
  }
}
