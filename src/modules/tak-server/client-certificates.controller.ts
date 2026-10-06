import { Body, Controller, Get, Path, Post, Request, Response, Route, Security, SuccessResponse, Tags } from "@tsoa/runtime";
import type { ProblemDetails } from "../../shared/errors/problem.js";
import { requestContext } from "../../shared/http/request-context.js";
import type { Uuid } from "../../shared/http/uuid.js";
import type { RevokeTakCertificateRequest, TakClientCertificateDto } from "./client-certificates.dto.js";
import {
  listMyTakCertificates,
  listTakClientCertificates,
  revokeMyTakCertificate,
  revokeTakClientCertificate,
} from "./client-certificates.service.js";

/** Client certificates issued by the built-in TAK server. Requires `tak-server.manage`. */
@Route("tak-server/client-certificates")
@Tags("TAK server")
@Security("sessionCookie")
@Response<ProblemDetails>(401, "Authentication required")
@Response<ProblemDetails>(403, "Access denied")
export class TakClientCertificatesController extends Controller {
  /** The 500 newest certificates. */
  @Get()
  @SuccessResponse(200, "Client certificates")
  public async listTakClientCertificates(@Request() request: unknown): Promise<TakClientCertificateDto[]> {
    return listTakClientCertificates(requestContext(request).principal);
  }

  /** Revokes a certificate; its TAK connections end immediately and it cannot reconnect. */
  @Post("{certificateId}/revoke")
  @SuccessResponse(200, "Certificate revoked")
  @Response<ProblemDetails>(404, "Not found")
  public async revokeTakClientCertificate(
    @Request() request: unknown,
    @Path() certificateId: Uuid,
    @Body() body: RevokeTakCertificateRequest,
  ): Promise<TakClientCertificateDto> {
    return revokeTakClientCertificate(requestContext(request), certificateId, body);
  }
}

/** The signed-in user's own TAK certificates, e.g. to cut off a lost phone. */
@Route("me/tak-certificates")
@Tags("TAK server")
@Security("sessionCookie")
@Response<ProblemDetails>(401, "Authentication required")
export class MyTakCertificatesController extends Controller {
  @Get()
  @SuccessResponse(200, "Own certificates")
  public async listMyTakCertificates(@Request() request: unknown): Promise<TakClientCertificateDto[]> {
    return listMyTakCertificates(requestContext(request).principal);
  }

  @Post("{certificateId}/revoke")
  @SuccessResponse(200, "Certificate revoked")
  @Response<ProblemDetails>(404, "Not found")
  public async revokeMyTakCertificate(
    @Request() request: unknown,
    @Path() certificateId: Uuid,
    @Body() body: RevokeTakCertificateRequest,
  ): Promise<TakClientCertificateDto> {
    return revokeMyTakCertificate(requestContext(request), certificateId, body);
  }
}
