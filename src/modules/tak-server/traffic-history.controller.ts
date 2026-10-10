import { Readable } from "node:stream";
import {
  Controller,
  Delete,
  Get,
  Middlewares,
  Path,
  Produces,
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
import type { DeletedTakTrafficDto, TakTrafficExportFormat, TakTrafficHistoryDto } from "./traffic-history.dto.js";
import { deleteRecordedTakTraffic, exportTakTracks, getTakTrafficHistory } from "./traffic-history.service.js";

const HISTORY_PARAMETERS = ["from", "to", "groupId", "uid", "gapSeconds"];

/**
 * Recorded TAK positions of an event as movement tracks, for the timeline, replay and exports.
 * Only events that opted in to recording have any; the live view stays in memory only.
 */
@Route("events/{eventId}/tak-traffic")
@Tags("TAK server")
@Security("sessionCookie")
@Response<ProblemDetails>(401, "Authentication required")
@Response<ProblemDetails>(403, "Access denied")
@Response<ProblemDetails>(404, "Not found")
export class TakTrafficHistoryController extends Controller {
  /**
   * Recorded positions between `from` and `to` (at most 31 days), grouped into tracks per CoT UID
   * and split wherever positions are more than `gapSeconds` apart, jump implausibly or are only
   * approximate. `groupId` keeps positions sent by members of one event group; `uid` keeps one
   * track. At most 20,000 positions, oldest first; `truncated` says the newest are missing.
   * Requires `tak-traffic.history`; every request is audited.
   * @param from RFC 3339 instant with offset.
   * @param to RFC 3339 instant with offset.
   * @param uid CoT UID of one track.
   * @maxLength uid 200
   * @param gapSeconds Seconds without a position after which a track is broken. Default 300.
   * @isInt gapSeconds
   * @minimum gapSeconds 30
   * @maximum gapSeconds 3600
   */
  @Get("history")
  @Middlewares(allowQueryParameters(...HISTORY_PARAMETERS))
  @SuccessResponse(200, "Recorded tracks")
  @Response<ProblemDetails>(422, "Validation failed")
  public async getTakTrafficHistory(
    @Request() request: unknown,
    @Path() eventId: Uuid,
    @Query() from: string,
    @Query() to: string,
    @Query() groupId?: Uuid,
    @Query() uid?: string,
    @Query() gapSeconds?: number,
  ): Promise<TakTrafficHistoryDto> {
    this.setHeader("Cache-Control", "no-store");
    return getTakTrafficHistory(requestContext(request), eventId, { from, to, groupId, uid, gapSeconds });
  }

  /**
   * The same tracks as GeoJSON (one feature per continuous segment) or GPX (one track per UID,
   * one segment per continuous part, approximate positions as waypoints), at most 50,000
   * positions. Requires `tak-traffic.export`; every export is audited.
   * @maxLength uid 200
   * @isInt gapSeconds
   * @minimum gapSeconds 30
   * @maximum gapSeconds 3600
   */
  @Get("history/export")
  @Middlewares(allowQueryParameters("format", ...HISTORY_PARAMETERS))
  @Produces("application/geo+json")
  @Produces("application/gpx+xml")
  @SuccessResponse(200, "Tracks as GeoJSON or GPX")
  @Response<ProblemDetails>(422, "Validation failed")
  public async exportTakTracks(
    @Request() request: unknown,
    @Path() eventId: Uuid,
    @Query() format: TakTrafficExportFormat,
    @Query() from: string,
    @Query() to: string,
    @Query() groupId?: Uuid,
    @Query() uid?: string,
    @Query() gapSeconds?: number,
  ): Promise<Readable> {
    const result = await exportTakTracks(requestContext(request), eventId, format, { from, to, groupId, uid, gapSeconds });
    this.setHeader("Content-Type", result.contentType);
    this.setHeader("Content-Disposition", `attachment; filename="${result.fileName}"`);
    this.setHeader("Cache-Control", "no-store");
    return Readable.from([Buffer.from(result.body, "utf8")]);
  }

  /**
   * Deletes the event's recorded traffic now instead of after the retention, or only the items of
   * one CoT UID. Requires `tak-traffic.delete`; audited.
   * @maxLength uid 200
   */
  @Delete("recording/items")
  @Middlewares(allowQueryParameters("uid"))
  @SuccessResponse(200, "Recorded traffic deleted")
  public async deleteRecordedTakTraffic(@Request() request: unknown, @Path() eventId: Uuid, @Query() uid?: string): Promise<DeletedTakTrafficDto> {
    return deleteRecordedTakTraffic(requestContext(request), eventId, uid);
  }
}
