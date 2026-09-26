import { Body, Controller, Get, Post, Request, Response, Route, Security, SuccessResponse, Tags } from "tsoa";
import type { ProblemDetails } from "../../shared/errors/problem.js";
import { requestContext } from "../../shared/http/request-context.js";
import type {
  ImportTakCertificateAuthorityRequest,
  TakCertificateAuthorityDto,
} from "./certificate-authority.dto.js";
import {
  importTakCertificateAuthority,
  listCertificateAuthorities,
  rotateTakCertificateAuthority,
} from "./certificate-authority.service.js";

/** Certificate authorities of the built-in TAK server. Requires `tak-server.manage`. */
@Route("tak-server/certificate-authorities")
@Tags("TAK server")
@Security("sessionCookie")
@Response<ProblemDetails>(401, "Authentication required")
@Response<ProblemDetails>(403, "Access denied")
export class TakCertificateAuthoritiesController extends Controller {
  /**
   * Lists the active CA and older CAs that are still trusted. A new installation creates its own
   * CA on the first call. Private keys are never returned.
   */
  @Get()
  @SuccessResponse(200, "Certificate authorities")
  public async listTakCertificateAuthorities(@Request() request: unknown): Promise<TakCertificateAuthorityDto[]> {
    return listCertificateAuthorities(requestContext(request).principal);
  }

  /**
   * Generates a new CA and makes it the active one. The previous CA stays trusted until it
   * expires. Requires a recent sign-in.
   */
  @Post("rotate")
  @SuccessResponse(201, "Certificate authority created")
  public async rotateTakCertificateAuthority(@Request() request: unknown): Promise<TakCertificateAuthorityDto> {
    this.setStatus(201);
    return rotateTakCertificateAuthority(requestContext(request));
  }

  /**
   * Imports an existing CA and makes it the active one. The previous CA stays trusted until it
   * expires. Requires a recent sign-in; the key is encrypted at rest and never returned.
   */
  @Post("import")
  @SuccessResponse(201, "Certificate authority imported")
  @Response<ProblemDetails>(422, "Validation failed")
  public async importTakCertificateAuthority(
    @Request() request: unknown,
    @Body() body: ImportTakCertificateAuthorityRequest,
  ): Promise<TakCertificateAuthorityDto> {
    this.setStatus(201);
    return importTakCertificateAuthority(requestContext(request), body);
  }
}
