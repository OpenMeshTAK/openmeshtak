import { Readable } from "node:stream";
import {
  Body,
  Controller,
  Get,
  Middlewares,
  Path,
  Post,
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
import type { CreateOfflineSnapshotRequest, OfflineSnapshotDto, OfflineTilePage } from "./offline-snapshot.dto.js";
import { createOfflineSnapshot, offlineImage, offlineTilePage } from "./offline-snapshot.service.js";

/**
 * Published Data Package content of an active event for the offline HQ view, which the browser
 * stores after an explicit request by the operator. Requires `data-packages.read`.
 */
@Route("events/{eventId}/offline-snapshots")
@Tags("Offline")
@Security("sessionCookie")
@Security("apiClientBearer")
@Response<ProblemDetails>(401, "Authentication required")
@Response<ProblemDetails>(403, "Access denied")
@Response<ProblemDetails>(404, "Not found")
@Response<ProblemDetails>(409, "Event not active")
export class OfflineSnapshotController extends Controller {
  /**
   * Describes the published revisions of the selected packages: layers, objects and displayable
   * map content with sizes and checksums. Stores nothing on the server; audited.
   */
  @Post()
  @SuccessResponse(200, "Offline snapshot document")
  @Response<ProblemDetails>(422, "Validation failed")
  public async createOfflineSnapshot(
    @Request() request: unknown,
    @Path() eventId: Uuid,
    @Body() body: CreateOfflineSnapshotRequest,
  ): Promise<OfflineSnapshotDto> {
    this.setHeader("Cache-Control", "no-store");
    return createOfflineSnapshot(requestContext(request), eventId, body);
  }

  /**
   * One page of the tiles of a published offline map, base64-encoded with their SHA-256.
   * @isInt number
   * @minimum number 1
   * @isInt limit
   * @minimum limit 1
   * @maximum limit 100
   */
  @Get("packages/{packageId}/revisions/{number}/contents/{contentId}/tiles")
  @Middlewares(allowQueryParameters("limit", "cursor"))
  @SuccessResponse(200, "Tile page")
  @Response<ProblemDetails>(400, "Invalid cursor")
  public async listOfflineTiles(
    @Request() request: unknown,
    @Path() eventId: Uuid,
    @Path() packageId: Uuid,
    @Path() number: number,
    @Path() contentId: Uuid,
    @Query() limit?: number,
    @Query() cursor?: string,
  ): Promise<OfflineTilePage> {
    this.setHeader("Cache-Control", "no-store");
    return offlineTilePage(requestContext(request).principal, eventId, packageId, number, contentId, limit, cursor);
  }

  /**
   * The image of a published rubber sheet.
   * @isInt number
   * @minimum number 1
   */
  @Get("packages/{packageId}/revisions/{number}/contents/{contentId}/image")
  @Produces("image/png")
  @SuccessResponse(200, "Rubber-sheet image")
  public async getOfflineImage(
    @Request() request: unknown,
    @Path() eventId: Uuid,
    @Path() packageId: Uuid,
    @Path() number: number,
    @Path() contentId: Uuid,
  ): Promise<Readable> {
    const { bytes, mediaType } = await offlineImage(requestContext(request).principal, eventId, packageId, number, contentId);
    this.setHeader("Content-Type", mediaType);
    // Private event content: never kept in a shared or browser HTTP cache.
    this.setHeader("Cache-Control", "no-store");
    return Readable.from([Buffer.from(bytes)]);
  }
}
