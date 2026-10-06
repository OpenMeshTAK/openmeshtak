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
} from "@tsoa/runtime";
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
  CreateApiClientRequest,
  ApiClientDto,
  ApiClientPage,
  UpdateApiClientRequest,
} from "./api-client.dto.js";
import {
  createApiClient,
  getApiClient,
  listApiClients,
  updateApiClient,
} from "./api-clients.service.js";

const apiKeyIssuanceRateLimit = issuanceRateLimit(20, "API keys");

/**
 * API clients are managed by humans only. Machine principals cannot create or rotate
 * credentials, so these operations accept the interactive session scheme exclusively.
 */
@Route("api-clients")
@Tags("API clients")
@Security("sessionCookie")
@Response<ProblemDetails>(401, "Authentication required")
@Response<ProblemDetails>(403, "Access denied")
export class ApiClientsController extends Controller {
  /**
   * Lists API clients ordered by creation time, oldest first.
   * @isInt limit
   * @minimum limit 1
   * @maximum limit 100
   */
  @Get()
  @SuccessResponse(200, "API clients")
  @Middlewares(allowQueryParameters("limit", "cursor"))
  @Response<ProblemDetails>(400, "Invalid cursor")
  public async listApiClients(
    @Request() request: unknown,
    @Query() limit?: number,
    @Query() cursor?: string,
  ): Promise<ApiClientPage> {
    const { principal } = requestContext(request);
    return listApiClients(principal, limit, cursor);
  }

  /** Creates an API client with explicit permission grants. */
  @Post()
  @SuccessResponse(201, "API client created")
  @Response<ProblemDetails>(422, "Validation failed")
  public async createApiClient(
    @Request() request: unknown,
    @Body() body: CreateApiClientRequest,
  ): Promise<ApiClientDto> {
    const created = await createApiClient(requestContext(request), body);
    this.setStatus(201);
    return created;
  }

  @Get("{apiClientId}")
  @SuccessResponse(200, "API client")
  @Response<ProblemDetails>(404, "Not found")
  public async getApiClient(
    @Request() request: unknown,
    @Path() apiClientId: Uuid,
  ): Promise<ApiClientDto> {
    return getApiClient(requestContext(request).principal, apiClientId);
  }

  /** Replaces name, description, status and grants. Requires the current `version`. */
  @Put("{apiClientId}")
  @SuccessResponse(200, "API client updated")
  @Response<ProblemDetails>(404, "Not found")
  @Response<ProblemDetails>(409, "Version conflict")
  @Response<ProblemDetails>(422, "Validation failed")
  public async updateApiClient(
    @Request() request: unknown,
    @Path() apiClientId: Uuid,
    @Body() body: UpdateApiClientRequest,
  ): Promise<ApiClientDto> {
    return updateApiClient(requestContext(request), apiClientId, body);
  }

  /**
   * Lists safe API-key metadata. Key secrets are never returned after creation.
   * @isInt limit
   * @minimum limit 1
   * @maximum limit 100
   */
  @Get("{apiClientId}/api-keys")
  @SuccessResponse(200, "API keys")
  @Middlewares(allowQueryParameters("limit", "cursor"))
  @Response<ProblemDetails>(400, "Invalid cursor")
  @Response<ProblemDetails>(404, "Not found")
  public async listApiKeys(
    @Request() request: unknown,
    @Path() apiClientId: Uuid,
    @Query() limit?: number,
    @Query() cursor?: string,
  ): Promise<ApiKeyPage> {
    return listApiKeys(requestContext(request), apiClientId, limit, cursor);
  }

  /**
   * Creates an API key and returns its complete value exactly once. Creating a key while another
   * is active is a rotation. Requires a recent sign-in.
   */
  @Post("{apiClientId}/api-keys")
  @Middlewares(apiKeyIssuanceRateLimit)
  @SuccessResponse(201, "API key created")
  @Response<ProblemDetails>(429, "Too many new API keys")
  @Response<ProblemDetails>(404, "Not found")
  @Response<ProblemDetails>(422, "Validation failed")
  public async createApiKey(
    @Request() request: unknown,
    @Path() apiClientId: Uuid,
    @Body() body: CreateApiKeyRequest,
  ): Promise<CreatedApiKeyResponse> {
    const context = requestContext(request);
    preventCaching(context);
    const principal = requireUserPrincipal(context.principal);
    const created = await createApiKey({ ...context, principal }, apiClientId, body);
    this.setStatus(201);
    return created;
  }

  /** Revokes an API key immediately. Repeating the request is harmless. */
  @Post("{apiClientId}/api-keys/{apiKeyId}/revoke")
  @SuccessResponse(200, "API key revoked")
  @Response<ProblemDetails>(404, "Not found")
  public async revokeApiKey(
    @Request() request: unknown,
    @Path() apiClientId: Uuid,
    @Path() apiKeyId: Uuid,
  ): Promise<ApiKeyDto> {
    return revokeApiKey(requestContext(request), apiClientId, apiKeyId);
  }
}
