import { isPlaceholderEmail } from "../auth/claim-session.plugin.js";
import { recordAudit } from "../../shared/audit/audit.js";
import { requirePermission } from "../../shared/auth/permission-check.js";
import type { ActorContext, Principal } from "../../shared/auth/principal.js";
import { database } from "../../shared/database/database.js";
import { notFoundProblem, ProblemError, versionConflictProblem } from "../../shared/errors/problem-error.js";
import {
  afterCursor,
  CURSOR_ORDER,
  DEFAULT_PAGE_LIMIT,
  decodeCursor,
  toPage,
} from "../../shared/pagination/cursor.js";
import type { UpdateUserRequest, UserDto, UserPage } from "./user.dto.js";

const LIST_CONTEXT = "users";

export const userSelection = {
  id: true,
  displayName: true,
  disabledAt: true,
  version: true,
  createdAt: true,
  authSubject: { select: { email: true } },
} as const;

interface UserRow {
  id: string;
  displayName: string;
  disabledAt: Date | null;
  version: number;
  createdAt: Date;
  authSubject: { email: string } | null;
}

export function toUserDto(row: UserRow): UserDto {
  return {
    id: row.id,
    displayName: row.displayName,
    // Claim placeholders are internal Better Auth requirements, not real addresses.
    email:
      row.authSubject === null || isPlaceholderEmail(row.authSubject.email)
        ? null
        : row.authSubject.email,
    disabled: row.disabledAt !== null,
    version: row.version,
    createdAt: row.createdAt.toISOString(),
  };
}

/** Name or email contains the search text; case handling follows the database collation. */
function searchFilter(search: string | undefined) {
  const text = search?.trim() ?? "";
  return text === ""
    ? {}
    : { OR: [{ displayName: { contains: text } }, { authSubject: { email: { contains: text } } }] };
}

export async function listUsers(
  principal: Principal,
  limit = DEFAULT_PAGE_LIMIT,
  cursor?: string,
  search?: string,
): Promise<UserPage> {
  await requirePermission(principal, "users.read");
  const context = `${LIST_CONTEXT}?${search ?? ""}`;
  const position = cursor === undefined ? null : decodeCursor(context, cursor);

  const rows = await database.domainUser.findMany({
    where: { ...afterCursor(position), ...searchFilter(search) },
    orderBy: [...CURSOR_ORDER],
    take: limit + 1,
    select: userSelection,
  });
  return toPage(context, rows, limit, toUserDto);
}

export async function getUser(principal: Principal, id: string): Promise<UserDto> {
  await requirePermission(principal, "users.read");

  const row = await database.domainUser.findUnique({ where: { id }, select: userSelection });
  if (row === null) {
    throw notFoundProblem();
  }
  return toUserDto(row);
}

async function findForUpdate(id: string) {
  const row = await database.domainUser.findUnique({ where: { id }, select: { ...userSelection, authSubjectId: true } });
  if (row === null) {
    throw notFoundProblem();
  }
  return row;
}

function auditEntry(actor: ActorContext, action: string, userId: string, metadata: Record<string, unknown> = {}) {
  return {
    actor: actor.principal,
    action,
    targetType: "user",
    targetId: userId,
    result: "success" as const,
    traceId: actor.traceId,
    metadata,
  };
}

/** Renames a user. Requires instance-wide `users.manage`. */
export async function updateUser(actor: ActorContext, id: string, input: UpdateUserRequest): Promise<UserDto> {
  await requirePermission(actor.principal, "users.manage");
  await findForUpdate(id);
  await database.$transaction(async (transaction) => {
    const updated = await transaction.domainUser.updateMany({
      where: { id, version: input.version },
      data: { displayName: input.displayName, version: { increment: 1 } },
    });
    if (updated.count !== 1) {
      throw versionConflictProblem((await findForUpdate(id)).version);
    }
    await recordAudit(auditEntry(actor, "user.updated", id), transaction);
  });
  return toUserDto(await findForUpdate(id));
}

/** Ends every browser session of a user, e.g. after a lost device. Requires `users.manage`. */
export async function revokeUserSessions(actor: ActorContext, id: string): Promise<void> {
  await requirePermission(actor.principal, "users.manage");
  const user = await findForUpdate(id);
  await database.$transaction(async (transaction) => {
    const deleted =
      user.authSubjectId === null ? { count: 0 } : await transaction.session.deleteMany({ where: { userId: user.authSubjectId } });
    await recordAudit(auditEntry(actor, "user.sessions-revoked", id, { sessions: deleted.count }), transaction);
  });
}

function cannotDisableSelf(): ProblemError {
  return new ProblemError({
    type: "urn:openmeshtak:problem:cannot-disable-self",
    title: "You cannot disable yourself",
    status: 409,
    detail: "Ask another administrator to disable your account.",
    code: "CANNOT_DISABLE_SELF",
  });
}

/**
 * Disables or re-enables a user. Disabling ends all sessions at once; sign-in, access links and
 * TAK connections are refused until the account is enabled again. Requires `users.manage`.
 */
export async function setUserDisabled(actor: ActorContext, id: string, disabled: boolean): Promise<UserDto> {
  await requirePermission(actor.principal, "users.manage");
  if (disabled && actor.principal.type === "user" && actor.principal.id === id) {
    throw cannotDisableSelf();
  }
  const user = await findForUpdate(id);
  await database.$transaction(async (transaction) => {
    await transaction.domainUser.update({
      where: { id },
      data: { disabledAt: disabled ? new Date() : null, version: { increment: 1 } },
    });
    if (disabled && user.authSubjectId !== null) {
      await transaction.session.deleteMany({ where: { userId: user.authSubjectId } });
    }
    await recordAudit(auditEntry(actor, disabled ? "user.disabled" : "user.enabled", id), transaction);
  });
  return toUserDto(await findForUpdate(id));
}
