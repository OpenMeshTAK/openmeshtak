import type { Principal } from "../../shared/auth/principal.js";
import { database } from "../../shared/database/database.js";
import {
  afterCursor,
  CURSOR_ORDER,
  DEFAULT_PAGE_LIMIT,
  decodeCursor,
  toPage,
} from "../../shared/pagination/cursor.js";
import { requireEventPermission } from "../events/event-access.js";
import type { SyncIssuePage, SyncIssueStatus } from "./event-member.dto.js";
import { toSyncIssueDto } from "./event-member.mapper.js";

export async function listSyncIssues(
  principal: Principal,
  eventId: string,
  options: { limit?: number | undefined; cursor?: string | undefined; status?: SyncIssueStatus | undefined },
): Promise<SyncIssuePage> {
  await requireEventPermission(principal, eventId, "members.read");
  const limit = options.limit ?? DEFAULT_PAGE_LIMIT;
  const context = `events/${eventId}/sync-issues?status=${options.status ?? ""}`;
  const position = options.cursor === undefined ? null : decodeCursor(context, options.cursor);

  const rows = await database.syncIssue.findMany({
    where: {
      eventId,
      ...(options.status === undefined ? {} : { status: options.status }),
      ...afterCursor(position),
    },
    orderBy: [...CURSOR_ORDER],
    take: limit + 1,
  });
  return toPage(context, rows, limit, toSyncIssueDto);
}
