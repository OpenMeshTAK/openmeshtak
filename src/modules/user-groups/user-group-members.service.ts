import { recordAudit } from "../../shared/audit/audit.js";
import { requirePermission } from "../../shared/auth/permission-check.js";
import { requireDelegableGrants } from "../../shared/auth/permission-grants.js";
import type { Permission } from "../../shared/auth/permissions.js";
import type { ActorContext, Principal } from "../../shared/auth/principal.js";
import { database } from "../../shared/database/database.js";
import { notFoundProblem } from "../../shared/errors/problem-error.js";
import {
  afterCursor,
  CURSOR_ORDER,
  DEFAULT_PAGE_LIMIT,
  decodeCursor,
  toPage,
} from "../../shared/pagination/cursor.js";
import type { UserPage } from "../users/user.dto.js";
import { toUserDto, userSelection } from "../users/users.service.js";
import { findUserGroupRow, systemGroupProtected } from "./user-groups.service.js";

async function requireUser(userId: string): Promise<void> {
  const user = await database.domainUser.findUnique({ where: { id: userId }, select: { id: true } });
  if (user === null) {
    throw notFoundProblem();
  }
}

export async function listUserGroupMembers(
  principal: Principal,
  userGroupId: string,
  limit = DEFAULT_PAGE_LIMIT,
  cursor?: string,
): Promise<UserPage> {
  await requirePermission(principal, "user-groups.read");
  await findUserGroupRow(userGroupId);
  const context = `user-groups/${userGroupId}/members`;
  const position = cursor === undefined ? null : decodeCursor(context, cursor);

  const rows = await database.domainUser.findMany({
    where: { memberships: { some: { userGroupId } }, ...afterCursor(position) },
    orderBy: [...CURSOR_ORDER],
    take: limit + 1,
    select: userSelection,
  });
  return toPage(context, rows, limit, toUserDto);
}

/**
 * Membership hands every grant of the group to the new member, so the actor must hold all of
 * them. Adding an existing member is a harmless no-op.
 */
export async function addUserGroupMember(
  actor: ActorContext,
  userGroupId: string,
  userId: string,
): Promise<void> {
  await requirePermission(actor.principal, "user-group-members.manage");
  const group = await findUserGroupRow(userGroupId);
  await requireUser(userId);
  await requireDelegableGrants(
    actor.principal,
    group.permissionGrants.map(({ permission, eventId, scopeKey }) => ({
      // Stored names were validated against the catalog when the grant was written.
      permission: permission as Permission,
      eventId,
      scopeKey,
    })),
  );

  await database.$transaction(async (transaction) => {
    const existing = await transaction.userGroupMembership.findUnique({
      where: { userId_userGroupId: { userId, userGroupId } },
    });
    if (existing !== null) {
      return;
    }

    await transaction.userGroupMembership.create({ data: { userId, userGroupId } });
    await recordAudit(
      {
        actor: actor.principal,
        action: "user-group.member-added",
        targetType: "user-group",
        targetId: userGroupId,
        result: "success",
        traceId: actor.traceId,
        metadata: { userId },
      },
      transaction,
    );
  });
}

/** Removing the last member of a system group is refused so nobody locks out administration. */
export async function removeUserGroupMember(
  actor: ActorContext,
  userGroupId: string,
  userId: string,
): Promise<void> {
  await requirePermission(actor.principal, "user-group-members.manage");
  const group = await findUserGroupRow(userGroupId);

  await database.$transaction(async (transaction) => {
    const removed = await transaction.userGroupMembership.deleteMany({
      where: { userId, userGroupId },
    });
    if (removed.count === 0) {
      throw notFoundProblem();
    }

    // Counting inside the transaction also covers two concurrent removals of different members.
    if (
      group.systemKey !== null &&
      (await transaction.userGroupMembership.count({ where: { userGroupId } })) === 0
    ) {
      throw systemGroupProtected("A system group must keep at least one member.");
    }

    await recordAudit(
      {
        actor: actor.principal,
        action: "user-group.member-removed",
        targetType: "user-group",
        targetId: userGroupId,
        result: "success",
        traceId: actor.traceId,
        metadata: { userId },
      },
      transaction,
    );
  });
}
