import {
  Body,
  Controller,
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
import {
  preventCaching,
  requestContext,
  requireUserPrincipal,
} from "../../shared/http/request-context.js";
import { issuanceRateLimit } from "../../shared/http/issuance-rate-limit.js";
import type { Uuid } from "../../shared/http/uuid.js";
import { createApiKey, listApiKeys, revokeApiKey } from "./api-keys.service.js";
import type {
  ApiKeyDto,
  ApiKeyPage,
  CreateApiKeyRequest,
  CreatedApiKeyResponse,
  CreateServiceAccountRequest,
  ServiceAccountDto,
  ServiceAccountPage,
  UpdateServiceAccountRequest,
} from "./service-account.dto.js";
import {
  createServiceAccount,
  getServiceAccount,
  listServiceAccounts,
  updateServiceAccount,
} from "./service-accounts.service.js";

const apiKeyIssuanceRateLimit = issuanceRateLimit(20, "API keys");

/**
 * Service accounts are managed by humans only. Machine principals cannot create or rotate
 * credentials, so these operations accept the interactive session scheme exclusively.
 */
@Route("service-accounts")
@Tags("Service accounts")
@Security("sessionCookie")
@Response<ProblemDetails>(401, "Authentication required")
@Response<ProblemDetails>(403, "Access denied")
export class ServiceAccountsController extends Controller {
  /**
   * Lists service accounts ordered by creation time, oldest first.
   * @isInt limit
   * @minimum limit 1
   * @maximum limit 100
   */
  @Get()
  @SuccessResponse(200, "Service accounts")
  @Middlewares(allowQueryParameters("limit", "cursor"))
  @Response<ProblemDetails>(400, "Invalid cursor")
  public async listServiceAccounts(
    @Request() request: unknown,
    @Query() limit?: number,
    @Query() cursor?: string,
  ): Promise<ServiceAccountPage> {
    const { principal } = requestContext(request);
    return listServiceAccounts(principal, limit, cursor);
  }

  /** Creates a service account with explicit permission grants. */
  @Post()
  @SuccessResponse(201, "Service account created")
  @Response<ProblemDetails>(422, "Validation failed")
  public async createServiceAccount(
    @Request() request: unknown,
    @Body() body: CreateServiceAccountRequest,
  ): Promise<ServiceAccountDto> {
    const created = await createServiceAccount(requestContext(request), body);
    this.setStatus(201);
    return created;
  }

  @Get("{serviceAccountId}")
  @SuccessResponse(200, "Service account")
  @Response<ProblemDetails>(404, "Not found")
  public async getServiceAccount(
    @Request() request: unknown,
    @Path() serviceAccountId: Uuid,
  ): Promise<ServiceAccountDto> {
    return getServiceAccount(requestContext(request).principal, serviceAccountId);
  }

  /** Replaces name, description, status and grants. Requires the current `version`. */
  @Put("{serviceAccountId}")
  @SuccessResponse(200, "Service account updated")
  @Response<ProblemDetails>(404, "Not found")
  @Response<ProblemDetails>(409, "Version conflict")
  @Response<ProblemDetails>(422, "Validation failed")
  public async updateServiceAccount(
    @Request() request: unknown,
    @Path() serviceAccountId: Uuid,
    @Body() body: UpdateServiceAccountRequest,
  ): Promise<ServiceAccountDto> {
    return updateServiceAccount(requestContext(request), serviceAccountId, body);
  }

  /**
   * Lists safe API-key metadata. Key secrets are never returned after creation.
   * @isInt limit
   * @minimum limit 1
   * @maximum limit 100
   */
  @Get("{serviceAccountId}/api-keys")
  @SuccessResponse(200, "API keys")
  @Middlewares(allowQueryParameters("limit", "cursor"))
  @Response<ProblemDetails>(400, "Invalid cursor")
  @Response<ProblemDetails>(404, "Not found")
  public async listApiKeys(
    @Request() request: unknown,
    @Path() serviceAccountId: Uuid,
    @Query() limit?: number,
    @Query() cursor?: string,
  ): Promise<ApiKeyPage> {
    return listApiKeys(requestContext(request), serviceAccountId, limit, cursor);
  }

  /**
   * Creates an API key and returns its complete value exactly once. Creating a key while another
   * is active is a rotation. Requires a recent sign-in.
   */
  @Post("{serviceAccountId}/api-keys")
  @Middlewares(apiKeyIssuanceRateLimit)
  @SuccessResponse(201, "API key created")
  @Response<ProblemDetails>(429, "Too many new API keys")
  @Response<ProblemDetails>(404, "Not found")
  @Response<ProblemDetails>(422, "Validation failed")
  public async createApiKey(
    @Request() request: unknown,
    @Path() serviceAccountId: Uuid,
    @Body() body: CreateApiKeyRequest,
  ): Promise<CreatedApiKeyResponse> {
    const context = requestContext(request);
    preventCaching(context);
    const principal = requireUserPrincipal(context.principal);
    const created = await createApiKey({ ...context, principal }, serviceAccountId, body);
    this.setStatus(201);
    return created;
  }

  /** Revokes an API key immediately. Repeating the request is harmless. */
  @Post("{serviceAccountId}/api-keys/{apiKeyId}/revoke")
  @SuccessResponse(200, "API key revoked")
  @Response<ProblemDetails>(404, "Not found")
  public async revokeApiKey(
    @Request() request: unknown,
    @Path() serviceAccountId: Uuid,
    @Path() apiKeyId: Uuid,
  ): Promise<ApiKeyDto> {
    return revokeApiKey(requestContext(request), serviceAccountId, apiKeyId);
  }
}
