import { Readable } from "node:stream";
import express, { type RequestHandler } from "express";
import { Controller, Get, Middlewares, Path, Post, Produces, Request, Response, Route, Security, SuccessResponse, Tags } from "@tsoa/runtime";
import { ProblemError } from "../../shared/errors/problem-error.js";
import type { ProblemDetails } from "../../shared/errors/problem.js";
import { requestContext } from "../../shared/http/request-context.js";
import type { Uuid } from "../../shared/http/uuid.js";
import { MAX_ICON_UPLOAD_BYTES } from "./atak/icon-database.js";
import type { IconLibraryImportResult, PackageIconDto } from "./icon-library.dto.js";
import { importIconLibrary, listPackageIcons, packageIconImage } from "./icon-library.service.js";

const iconUpload: RequestHandler = express.raw({ type: ["application/octet-stream", "application/x-sqlite3", "application/vnd.sqlite3"], limit: MAX_ICON_UPLOAD_BYTES });

@Route("events/{eventId}/data-packages/{packageId}")
@Tags("Data packages")
@Security("sessionCookie")
@Security("apiClientBearer")
@Response<ProblemDetails>(401, "Authentication required")
@Response<ProblemDetails>(403, "Access denied")
@Response<ProblemDetails>(404, "Not found")
export class IconLibraryController extends Controller {
  /** Imports PNG icons from WinTAK iconsets.sqlite (raw bytes, 10 MB maximum). Requires data-packages.edit; icons are editor-only and do not ship in TAK exports. */
  @Post("layers/{layerId}/import/icons")
  @Middlewares(iconUpload)
  @SuccessResponse(200, "Icon library imported")
  @Response<ProblemDetails>(409, "Layer locked, event archived or too many libraries")
  @Response<ProblemDetails>(413, "Upload too large")
  @Response<ProblemDetails>(415, "Unsupported upload")
  @Response<ProblemDetails>(422, "Invalid icon database")
  public async importPackageIcons(@Request() request: unknown, @Path() eventId: Uuid, @Path() packageId: Uuid, @Path() layerId: Uuid): Promise<IconLibraryImportResult> {
    const body = (request as { body?: unknown }).body;
    if (!Buffer.isBuffer(body) || body.length === 0) throw new ProblemError({ type: "urn:openmeshtak:problem:unsupported-media-type", title: "Unsupported upload", status: 415, code: "UNSUPPORTED_MEDIA_TYPE", detail: "Send iconsets.sqlite as application/octet-stream." });
    return importIconLibrary(requestContext(request), eventId, packageId, layerId, new Uint8Array(body));
  }

  /** The library's original TAK paths and safe image identifiers. Requires data-packages.read. */
  @Get("contents/{contentId}/icons")
  @SuccessResponse(200, "Icons")
  public async listIcons(@Request() request: unknown, @Path() eventId: Uuid, @Path() packageId: Uuid, @Path() contentId: Uuid): Promise<PackageIconDto[]> {
    return listPackageIcons(requestContext(request).principal, eventId, packageId, contentId);
  }

  /** One validated PNG, served only to an authorized package reader. */
  @Get("contents/{contentId}/icons/{iconId}/image")
  @Produces("image/png")
  @SuccessResponse(200, "Icon image")
  public async getIconImage(@Request() request: unknown, @Path() eventId: Uuid, @Path() packageId: Uuid, @Path() contentId: Uuid, @Path() iconId: Uuid): Promise<Readable> {
    const bytes = await packageIconImage(requestContext(request).principal, eventId, packageId, contentId, iconId);
    this.setHeader("Content-Type", "image/png");
    this.setHeader("X-Content-Type-Options", "nosniff");
    return Readable.from([Buffer.from(bytes)]);
  }
}
