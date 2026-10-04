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
  CreateMeshtasticChannelRequest,
  MeshtasticChannelDto,
  MeshtasticChannelPage,
  ReleaseMeshtasticChannelRequest,
  RevealedChannelPsk,
  RotateChannelPskRequest,
  UpdateMeshtasticChannelRequest,
} from "./meshtastic-channel.dto.js";
import {
  createMeshtasticChannel,
  deleteMeshtasticChannel,
  getMeshtasticChannel,
  listMeshtasticChannels,
  releaseMeshtasticChannel,
  revealMeshtasticChannelPsk,
  rotateMeshtasticChannelPsk,
  updateMeshtasticChannel,
} from "./meshtastic-channels.service.js";

/**
 * The event's Meshtastic channels. Changes reach participants only through a published
 * configuration revision. Reads need `events.read`, changes `events.manage`; keys are never part
 * of these responses and can be read back only through the audited reveal action.
 */
@Route("events/{eventId}/meshtastic/channels")
@Tags("Meshtastic channels")
@Security("sessionCookie")
@Security("apiClientBearer")
@Response<ProblemDetails>(401, "Authentication required")
@Response<ProblemDetails>(404, "Not found")
export class MeshtasticChannelsController extends Controller {
  /**
   * Lists the event's channels in creation order; sort by `sortOrder` for the device order.
   * @isInt limit
   * @minimum limit 1
   * @maximum limit 100
   */
  @Get()
  @SuccessResponse(200, "Meshtastic channels")
  @Middlewares(allowQueryParameters("limit", "cursor"))
  @Response<ProblemDetails>(400, "Invalid cursor")
  public async listMeshtasticChannels(
    @Request() request: unknown,
    @Path() eventId: Uuid,
    @Query() limit?: number,
    @Query() cursor?: string,
  ): Promise<MeshtasticChannelPage> {
    return listMeshtasticChannels(requestContext(request).principal, eventId, limit, cursor);
  }

  /** Creates a channel; without `psk` the server generates a random 32-byte key. */
  @Post()
  @SuccessResponse(201, "Meshtastic channel created")
  @Response<ProblemDetails>(403, "Access denied")
  @Response<ProblemDetails>(409, "Name in use, channel limit reached or event archived")
  @Response<ProblemDetails>(422, "Validation failed")
  public async createMeshtasticChannel(
    @Request() request: unknown,
    @Path() eventId: Uuid,
    @Body() body: CreateMeshtasticChannelRequest,
  ): Promise<MeshtasticChannelDto> {
    const created = await createMeshtasticChannel(requestContext(request), eventId, body);
    this.setStatus(201);
    return created;
  }

  @Get("{channelId}")
  @SuccessResponse(200, "Meshtastic channel")
  public async getMeshtasticChannel(
    @Request() request: unknown,
    @Path() eventId: Uuid,
    @Path() channelId: Uuid,
  ): Promise<MeshtasticChannelDto> {
    return getMeshtasticChannel(requestContext(request).principal, eventId, channelId);
  }

  /** Replaces everything except the key. Requires the current `version`. */
  @Put("{channelId}")
  @SuccessResponse(200, "Meshtastic channel updated")
  @Response<ProblemDetails>(403, "Access denied")
  @Response<ProblemDetails>(409, "Version conflict, name in use or event archived")
  @Response<ProblemDetails>(422, "Validation failed")
  public async updateMeshtasticChannel(
    @Request() request: unknown,
    @Path() eventId: Uuid,
    @Path() channelId: Uuid,
    @Body() body: UpdateMeshtasticChannelRequest,
  ): Promise<MeshtasticChannelDto> {
    return updateMeshtasticChannel(requestContext(request), eventId, channelId, body);
  }

  @Delete("{channelId}")
  @SuccessResponse(204, "Meshtastic channel deleted")
  @Response<ProblemDetails>(403, "Access denied")
  @Response<ProblemDetails>(409, "Event archived")
  public async deleteMeshtasticChannel(
    @Request() request: unknown,
    @Path() eventId: Uuid,
    @Path() channelId: Uuid,
  ): Promise<void> {
    await deleteMeshtasticChannel(requestContext(request), eventId, channelId);
    this.setStatus(204);
  }

  /** Replaces the key, for example after a leak. Audited; requires the current `version`. */
  @Post("{channelId}/psk/rotate")
  @SuccessResponse(200, "Key rotated")
  @Response<ProblemDetails>(403, "Access denied")
  @Response<ProblemDetails>(409, "Version conflict or event archived")
  @Response<ProblemDetails>(422, "Validation failed")
  public async rotateMeshtasticChannelPsk(
    @Request() request: unknown,
    @Path() eventId: Uuid,
    @Path() channelId: Uuid,
    @Body() body: RotateChannelPskRequest,
  ): Promise<MeshtasticChannelDto> {
    return rotateMeshtasticChannelPsk(requestContext(request), eventId, channelId, body);
  }

  /**
   * Releases a withheld secret channel to its whole audience. Audited; requires the current
   * `version`.
   */
  @Post("{channelId}/release")
  @SuccessResponse(200, "Channel released")
  @Response<ProblemDetails>(403, "Access denied")
  @Response<ProblemDetails>(409, "Version conflict, channel not withheld or event archived")
  public async releaseMeshtasticChannel(
    @Request() request: unknown,
    @Path() eventId: Uuid,
    @Path() channelId: Uuid,
    @Body() body: ReleaseMeshtasticChannelRequest,
  ): Promise<MeshtasticChannelDto> {
    return releaseMeshtasticChannel(requestContext(request), eventId, channelId, body);
  }

  /** Returns the plain key. Requires `channel-keys.reveal`; every reveal is audited. */
  @Post("{channelId}/psk/reveal")
  @SuccessResponse(200, "Channel key")
  @Response<ProblemDetails>(403, "Access denied")
  public async revealMeshtasticChannelPsk(
    @Request() request: unknown,
    @Path() eventId: Uuid,
    @Path() channelId: Uuid,
  ): Promise<RevealedChannelPsk> {
    return revealMeshtasticChannelPsk(requestContext(request), eventId, channelId);
  }
}
