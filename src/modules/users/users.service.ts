import { isPlaceholderEmail } from "../auth/claim-session.plugin.js";
import { requirePermission } from "../../shared/auth/permission-check.js";
import type { Principal } from "../../shared/auth/principal.js";
import { database } from "../../shared/database/database.js";
import { notFoundProblem } from "../../shared/errors/problem-error.js";
import {
  afterCursor,
  CURSOR_ORDER,
  DEFAULT_PAGE_LIMIT,
  decodeCursor,
  toPage,
} from "../../shared/pagination/cursor.js";
import type { UserDto, UserPage } from "./user.dto.js";

const LIST_CONTEXT = "users";

const userSelection = {
  id: true,
  displayName: true,
  createdAt: true,
  authSubject: { select: { email: true } },
} as const;

interface UserRow {
  id: string;
  displayName: string;
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
    createdAt: row.createdAt.toISOString(),
  };
}

export async function listUsers(
  principal: Principal,
  limit = DEFAULT_PAGE_LIMIT,
  cursor?: string,
): Promise<UserPage> {
  await requirePermission(principal, "users.read");
  const position = cursor === undefined ? null : decodeCursor(LIST_CONTEXT, cursor);

  const rows = await database.domainUser.findMany({
    where: afterCursor(position),
    orderBy: [...CURSOR_ORDER],
    take: limit + 1,
    select: userSelection,
  });
  return toPage(LIST_CONTEXT, rows, limit, toUserDto);
}

export async function getUser(principal: Principal, id: string): Promise<UserDto> {
  await requirePermission(principal, "users.read");

  const row = await database.domainUser.findUnique({ where: { id }, select: userSelection });
  if (row === null) {
    throw notFoundProblem();
  }
  return toUserDto(row);
}
