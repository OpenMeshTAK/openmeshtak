import { Body, Controller, Delete, Get, Put, Request, Response, Route, Security, SuccessResponse, Tags } from "@tsoa/runtime";
import type { ProblemDetails } from "../../shared/errors/problem.js";
import { requestContext } from "../../shared/http/request-context.js";
import type {
  AddTakServerCertificateRequest,
  TakServerSettingsDto,
  UpdateTakServerSettingsRequest,
  UseTakCertificateFilesRequest,
} from "./tak-server-settings.dto.js";
import {
  addTakServerCertificate,
  getTakServerSettings,
  removeTakServerCertificate,
  updateTakServerSettings,
  useTakCertificateFiles,
} from "./tak-server-settings.service.js";

/** Settings of the built-in TAK server. Requires `tak-server.manage`. */
@Route("tak-server")
@Tags("TAK server")
@Security("sessionCookie")
@Response<ProblemDetails>(401, "Authentication required")
@Response<ProblemDetails>(403, "Access denied")
export class TakServerSettingsController extends Controller {
  @Get("settings")
  @SuccessResponse(200, "TAK server settings")
  public async getTakServerSettings(@Request() request: unknown): Promise<TakServerSettingsDto> {
    return getTakServerSettings(requestContext(request).principal);
  }

  /** Replaces the settings. Requires the current `version` (0 before the first save). */
  @Put("settings")
  @SuccessResponse(200, "Settings updated")
  @Response<ProblemDetails>(409, "Version conflict")
  @Response<ProblemDetails>(422, "Validation failed")
  public async updateTakServerSettings(
    @Request() request: unknown,
    @Body() body: UpdateTakServerSettingsRequest,
  ): Promise<TakServerSettingsDto> {
    return updateTakServerSettings(requestContext(request), body);
  }

  /**
   * Adds a publicly trusted server certificate for the TAK host name, e.g. the `fullchain.pem` and
   * `privkey.pem` of Let's Encrypt, so devices trust the server without the OpenMeshTak CA.
   * Requires a recent sign-in. Client certificates are still issued by the OpenMeshTak CA.
   */
  @Put("server-certificate")
  @SuccessResponse(200, "Server certificate added")
  @Response<ProblemDetails>(422, "Validation failed")
  public async addTakServerCertificate(
    @Request() request: unknown,
    @Body() body: AddTakServerCertificateRequest,
  ): Promise<TakServerSettingsDto> {
    return addTakServerCertificate(requestContext(request), body);
  }

  /**
   * Removes an added, ACME or file certificate and disables ACME and the file reload; the server then uses one issued by the
   * OpenMeshTak CA.
   */
  @Delete("server-certificate")
  @SuccessResponse(200, "Server certificate removed")
  public async removeTakServerCertificate(@Request() request: unknown): Promise<TakServerSettingsDto> {
    return removeTakServerCertificate(requestContext(request));
  }

  /**
   * Uses the reverse proxy's certificate files, mounted read-only below `certificateDirectory`.
   * Core reloads them every twelve hours, so a certificate the proxy renews is picked up. Disables ACME.
   */
  @Put("server-certificate/files")
  @SuccessResponse(200, "Certificate files in use")
  @Response<ProblemDetails>(422, "Validation failed")
  public async useTakCertificateFiles(
    @Request() request: unknown,
    @Body() body: UseTakCertificateFilesRequest,
  ): Promise<TakServerSettingsDto> {
    return useTakCertificateFiles(requestContext(request), body);
  }
}
