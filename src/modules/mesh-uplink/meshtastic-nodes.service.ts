import { randomUUID } from "node:crypto";
import type { Prisma } from "../../generated/prisma/client.js";
import { recordAudit } from "../../shared/audit/audit.js";
import type { ActorContext, Principal } from "../../shared/auth/principal.js";
import { database } from "../../shared/database/database.js";
import { isUniqueConstraintError } from "../../shared/database/unique-constraint.js";
import { notFoundProblem, ProblemError, validationProblem, versionConflictProblem } from "../../shared/errors/problem-error.js";
import { afterCursor, CURSOR_ORDER, DEFAULT_PAGE_LIMIT, decodeCursor, toPage } from "../../shared/pagination/cursor.js";
import { shortNameFor } from "../event-members/member-identity.js";
import { requireAnyEventPermission, requireMutableEvent } from "../events/event-access.js";
import { nodeIdOf, nodeNumOf } from "./mesh-node-id.js";
import type { BindMeshtasticNodeRequest, MeshtasticNodeDto, MeshtasticNodeMemberDto, MeshtasticNodePage } from "./meshtastic-node.dto.js";

const memberSelection = {
  id: true,
  userId: true,
  callsign: true,
  shortNameNumber: true,
  user: { select: { displayName: true } },
  eventGroup: { select: { shortNamePrefix: true } },
} satisfies Prisma.EventMemberSelect;

export type NodeMemberRow = Prisma.EventMemberGetPayload<{ select: typeof memberSelection }>;

const nodeSelection = {
  id: true,
  nodeId: true,
  shortName: true,
  longName: true,
  lastHeardAt: true,
  lastPositionAt: true,
  boundAt: true,
  version: true,
  createdAt: true,
  member: { select: memberSelection },
} satisfies Prisma.MeshtasticNodeSelect;

type NodeRow = Prisma.MeshtasticNodeGetPayload<{ select: typeof nodeSelection }>;

function toMember(row: NodeMemberRow): MeshtasticNodeMemberDto {
  return {
    memberId: row.id,
    userId: row.userId,
    displayName: row.user.displayName,
    callsign: row.callsign,
    shortName: shortNameFor(row.eventGroup.shortNamePrefix, row.shortNameNumber),
  };
}

function normalized(name: string | null): string | null {
  const trimmed = name?.trim().toLowerCase() ?? "";
  return trimmed.length === 0 ? null : trimmed;
}

/**
 * The unbound member a node was most likely provisioned for. OpenMeshTak writes the member's short
 * name and callsign into the radio, so both names must match, and exactly one member may match.
 * One name alone is too weak, e.g. after a participant renamed the radio.
 */
export function suggestMember(node: { shortName: string | null; longName: string | null }, members: readonly NodeMemberRow[]): NodeMemberRow | null {
  const shortName = normalized(node.shortName);
  const longName = normalized(node.longName);
  if (shortName === null || longName === null) {
    return null;
  }
  const matches = members.filter(
    (member) =>
      normalized(shortNameFor(member.eventGroup.shortNamePrefix, member.shortNameNumber)) === shortName && normalized(member.callsign) === longName,
  );
  return matches.length === 1 ? (matches[0] ?? null) : null;
}

function toDto(row: NodeRow, suggestion: NodeMemberRow | null): MeshtasticNodeDto {
  return {
    nodeNum: nodeNumOf(row.nodeId),
    nodeId: row.nodeId,
    shortName: row.shortName,
    longName: row.longName,
    lastHeardAt: row.lastHeardAt?.toISOString() ?? null,
    lastPositionAt: row.lastPositionAt?.toISOString() ?? null,
    binding: row.member === null || row.boundAt === null ? null : { member: toMember(row.member), boundAt: row.boundAt.toISOString() },
    suggestion: row.member === null && suggestion !== null ? toMember(suggestion) : null,
    version: row.version,
  };
}

/**
 * Reading the node list needs one of `mesh-bindings.manage` (binding operators), `mesh-uplink.send`
 * (the HQ that uploads and shows suggestions) or `members.read`. It shows node names and when they
 * were last heard, never positions.
 */
export async function listMeshtasticNodes(principal: Principal, eventId: string, limit = DEFAULT_PAGE_LIMIT, cursor?: string): Promise<MeshtasticNodePage> {
  await requireAnyEventPermission(principal, eventId, ["mesh-bindings.manage", "mesh-uplink.send", "members.read"]);
  const context = `events/${eventId}/meshtastic-nodes`;
  const position = cursor === undefined ? null : decodeCursor(context, cursor);
  const [rows, unboundMembers] = await Promise.all([
    database.meshtasticNode.findMany({
      where: { eventId, ...afterCursor(position) },
      orderBy: [...CURSOR_ORDER],
      take: limit + 1,
      select: nodeSelection,
    }),
    database.eventMember.findMany({ where: { eventId, meshtasticNode: null }, select: memberSelection }),
  ]);
  return toPage(context, rows, limit, (row) => toDto(row, row.member === null ? suggestMember(row, unboundMembers) : null));
}

function memberAlreadyBoundProblem(): ProblemError {
  return new ProblemError({
    type: "urn:openmeshtak:problem:meshtastic-member-bound",
    title: "Member already has a node",
    status: 409,
    detail: "This member is already bound to another Meshtastic node. Remove that binding first.",
    code: "MESHTASTIC_MEMBER_BOUND",
  });
}

async function findNode(eventId: string, nodeId: string): Promise<NodeRow | null> {
  return database.meshtasticNode.findUnique({ where: { eventId_nodeId: { eventId, nodeId } }, select: nodeSelection });
}

function audit(actor: ActorContext, action: string, eventId: string, nodeId: string, memberId: string | null) {
  return {
    actor: actor.principal,
    action,
    targetType: "meshtastic-node",
    targetId: nodeId,
    result: "success" as const,
    traceId: actor.traceId,
    metadata: { eventId, memberId },
  };
}

/**
 * Binds a node to a member: confirming a suggestion, correcting a binding or binding a radio before
 * it was heard. Requires `mesh-bindings.manage`. One node per member; positions already recorded
 * keep the UID they were recorded under.
 */
export async function bindMeshtasticNode(actor: ActorContext, eventId: string, nodeNum: number, input: BindMeshtasticNodeRequest): Promise<MeshtasticNodeDto> {
  await requireMutableEvent(actor.principal, eventId, "mesh-bindings.manage");
  const nodeId = nodeIdOf(nodeNum);
  const member = await database.eventMember.findFirst({ where: { id: input.memberId, eventId }, select: { id: true } });
  if (member === null) {
    throw validationProblem([{ field: "memberId", code: "UNKNOWN_REFERENCE", message: "Choose a member of this event." }]);
  }
  const current = await findNode(eventId, nodeId);
  if ((current?.version ?? 0) !== input.version) {
    throw versionConflictProblem(current?.version ?? 0);
  }
  const boundAt = new Date();
  try {
    await database.$transaction(async (transaction) => {
      if (current === null) {
        await transaction.meshtasticNode.create({ data: { id: randomUUID(), eventId, nodeId, memberId: member.id, boundAt } });
      } else {
        const updated = await transaction.meshtasticNode.updateMany({
          where: { id: current.id, version: input.version },
          data: { memberId: member.id, boundAt, version: { increment: 1 } },
        });
        if (updated.count !== 1) {
          throw versionConflictProblem((await transaction.meshtasticNode.findUnique({ where: { id: current.id } }))?.version ?? 0);
        }
      }
      await recordAudit(audit(actor, "meshtastic-node.bound", eventId, nodeId, member.id), transaction);
    });
  } catch (error: unknown) {
    if (isUniqueConstraintError(error)) {
      // Either the member has another node, or another request stored this node in between.
      const latest = await findNode(eventId, nodeId);
      throw latest !== null && latest.version !== input.version ? versionConflictProblem(latest.version) : memberAlreadyBoundProblem();
    }
    throw error;
  }
  return toDto((await findNode(eventId, nodeId)) as NodeRow, null);
}

/** Removes a node's binding; its later positions show as unknown again. Requires `mesh-bindings.manage`. */
export async function unbindMeshtasticNode(actor: ActorContext, eventId: string, nodeNum: number): Promise<void> {
  await requireMutableEvent(actor.principal, eventId, "mesh-bindings.manage");
  const nodeId = nodeIdOf(nodeNum);
  const current = await findNode(eventId, nodeId);
  if (current === null || current.member === null) {
    throw notFoundProblem();
  }
  const memberId = current.member.id;
  await database.$transaction(async (transaction) => {
    await transaction.meshtasticNode.update({ where: { id: current.id }, data: { memberId: null, boundAt: null, version: { increment: 1 } } });
    await recordAudit(audit(actor, "meshtastic-node.unbound", eventId, nodeId, memberId), transaction);
  });
}
