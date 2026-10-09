import { Readable } from "node:stream";
import express, { type RequestHandler } from "express";
import { Controller, Delete, Get, Middlewares, Path, Produces, Put, Query, Request, Response, Route, Security, SuccessResponse, Tags } from "@tsoa/runtime";
import { ProblemError } from "../../shared/errors/problem-error.js";
import type { ProblemDetails } from "../../shared/errors/problem.js";
import { allowQueryParameters } from "../../shared/http/query-allowlist.js";
import { requestContext } from "../../shared/http/request-context.js";
import type { Uuid } from "../../shared/http/uuid.js";
import { MAX_ICON_UPLOAD_BYTES } from "../data-packages/atak/icon-database.js";
import type { IconSettingsDto, InstanceIconCatalogue, UpdateIconSettingsResult } from "./icon-settings.dto.js";
import { clearIconSettings, getIconSettings, instanceIconCatalogue, instanceIconImage, updateIconSettings } from "./icon-settings.service.js";

const iconUpload: RequestHandler = express.raw({ type: ["application/octet-stream", "application/x-sqlite3", "application/vnd.sqlite3"], limit: MAX_ICON_UPLOAD_BYTES });

@Route("map/icons")
@Tags("Map")
@Security("sessionCookie")
@Response<ProblemDetails>(401, "Authentication required")
export class IconSettingsController extends Controller {
  /** The installation-wide library summary. Readable by signed-in users. */
  @Get("settings")
  @SuccessResponse(200, "Icon settings")
  public async getIconSettings(@Request() request: unknown): Promise<IconSettingsDto> {
    return getIconSettings(requestContext(request).principal);
  }

  /** Replaces installation-wide PNG icons using raw WinTAK SQLite bytes (10 MiB). Requires settings.manage.
   * @isInt version
   * @minimum version 0
   */
  @Put("settings")
  @Middlewares(allowQueryParameters("version"), iconUpload)
  @SuccessResponse(200, "Icon database imported")
  @Response<ProblemDetails>(403, "Access denied")
  @Response<ProblemDetails>(409, "Version conflict")
  @Response<ProblemDetails>(413, "Upload too large")
  @Response<ProblemDetails>(415, "Unsupported upload")
  @Response<ProblemDetails>(422, "Invalid icon database")
  public async updateIconSettings(@Request() request: unknown, @Query() version: number): Promise<UpdateIconSettingsResult> {
    const body = (request as { body?: unknown }).body;
    if (!Buffer.isBuffer(body) || body.length === 0) throw new ProblemError({ type: "urn:openmeshtak:problem:unsupported-media-type", title: "Unsupported upload", status: 415, code: "UNSUPPORTED_MEDIA_TYPE", detail: "Send iconsets.sqlite as application/octet-stream." });
    return updateIconSettings(requestContext(request), version, new Uint8Array(body));
  }

  /** Clears shared icons without changing stored marker paths. Requires settings.manage.
   * @isInt version
   * @minimum version 0
   */
  @Delete("settings")
  @Middlewares(allowQueryParameters("version"))
  @SuccessResponse(200, "Icon database removed")
  @Response<ProblemDetails>(403, "Access denied")
  @Response<ProblemDetails>(409, "Version conflict")
  public async clearSettings(@Request() request: unknown, @Query() version: number): Promise<IconSettingsDto> {
    return clearIconSettings(requestContext(request), version);
  }

  /** Original TAK icon paths and fallback types, shared by all signed-in editors. */
  @Get()
  @SuccessResponse(200, "Icon catalogue")
  public async getCatalogue(@Request() request: unknown): Promise<InstanceIconCatalogue> {
    return instanceIconCatalogue(requestContext(request).principal);
  }

  /** One PNG from the current library; stale versions and unknown IDs return 404.
   * @isInt version
   * @minimum version 1
   */
  @Get("{version}/{iconId}/image")
  @Produces("image/png")
  @SuccessResponse(200, "Icon image")
  @Response<ProblemDetails>(404, "Not found")
  public async getImage(@Request() request: unknown, @Path() version: number, @Path() iconId: Uuid): Promise<Readable> {
    const bytes = await instanceIconImage(requestContext(request).principal, version, iconId);
    this.setHeader("Content-Type", "image/png");
    this.setHeader("X-Content-Type-Options", "nosniff");
    return Readable.from([Buffer.from(bytes)]);
  }
}
