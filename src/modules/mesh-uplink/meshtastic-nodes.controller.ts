import { Body, Controller, Delete, Get, Middlewares, Path, Put, Query, Request, Response, Route, Security, SuccessResponse, Tags } from "@tsoa/runtime";
import type { ProblemDetails } from "../../shared/errors/problem.js";
import { allowQueryParameters } from "../../shared/http/query-allowlist.js";
import { requestContext } from "../../shared/http/request-context.js";
import type { Uuid } from "../../shared/http/uuid.js";
import type { BindMeshtasticNodeRequest, MeshtasticNodeDto, MeshtasticNodePage } from "./meshtastic-node.dto.js";
import { bindMeshtasticNode, listMeshtasticNodes, unbindMeshtasticNode } from "./meshtastic-nodes.service.js";

/**
 * Meshtastic nodes of an event and their bindings to members. Reading needs `mesh-bindings.manage`,
 * `mesh-uplink.send` or `members.read`; binding and unbinding need `mesh-bindings.manage`.
 */
@Route("events/{eventId}/meshtastic-nodes")
@Tags("Mesh uplink")
@Security("sessionCookie")
@Security("apiClientBearer")
@Response<ProblemDetails>(401, "Authentication required")
@Response<ProblemDetails>(404, "Not found")
export class MeshtasticNodesController extends Controller {
  /**
   * Lists the nodes the event's HQs heard or an operator bound, oldest first, each with its binding
   * or, when unbound, a suggested member whose provisioned short name and callsign match.
   * @isInt limit
   * @minimum limit 1
   * @maximum limit 100
   */
  @Get()
  @SuccessResponse(200, "Meshtastic nodes")
  @Middlewares(allowQueryParameters("limit", "cursor"))
  @Response<ProblemDetails>(400, "Invalid cursor")
  @Response<ProblemDetails>(403, "Access denied")
  public async listMeshtasticNodes(
    @Request() request: unknown,
    @Path() eventId: Uuid,
    @Query() limit?: number,
    @Query() cursor?: string,
  ): Promise<MeshtasticNodePage> {
    return listMeshtasticNodes(requestContext(request).principal, eventId, limit, cursor);
  }

  /**
   * Binds the node to a member, confirming a suggestion or changing the binding; works before the
   * node was heard. A member has at most one node. Already recorded positions are not rewritten.
   * @param nodeNum Unsigned 32-bit node number.
   * @isInt nodeNum
   * @minimum nodeNum 1
   * @maximum nodeNum 4294967294
   */
  @Put("{nodeNum}/binding")
  @SuccessResponse(200, "Node bound")
  @Response<ProblemDetails>(403, "Access denied")
  @Response<ProblemDetails>(409, "Version conflict, member already bound or event archived")
  @Response<ProblemDetails>(422, "Validation failed")
  public async bindMeshtasticNode(
    @Request() request: unknown,
    @Path() eventId: Uuid,
    @Path() nodeNum: number,
    @Body() body: BindMeshtasticNodeRequest,
  ): Promise<MeshtasticNodeDto> {
    return bindMeshtasticNode(requestContext(request), eventId, nodeNum, body);
  }

  /**
   * Removes the node's binding; its later positions show as unknown again.
   * @param nodeNum Unsigned 32-bit node number.
   * @isInt nodeNum
   * @minimum nodeNum 1
   * @maximum nodeNum 4294967294
   */
  @Delete("{nodeNum}/binding")
  @SuccessResponse(204, "Binding removed")
  @Response<ProblemDetails>(403, "Access denied")
  @Response<ProblemDetails>(409, "Event archived")
  public async unbindMeshtasticNode(@Request() request: unknown, @Path() eventId: Uuid, @Path() nodeNum: number): Promise<void> {
    await unbindMeshtasticNode(requestContext(request), eventId, nodeNum);
    this.setStatus(204);
  }
}
