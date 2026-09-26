import { database } from "../../../shared/database/database.js";
import type { TakAccess } from "../tak-access.js";

/** Members without TAK server groups share this one group within their event. */
const DEFAULT_GROUP = "__ANON__";

/**
 * Which traffic a connection may see and reach, per active event: the TAK server groups of the
 * member's event group, or every group for administrators.
 */
export type CotScope = Map<string, Set<string> | "all">;

export async function cotScopeFor(userId: string, access: TakAccess): Promise<CotScope> {
  if (access.admin) {
    return new Map(access.eventIds.map((eventId) => [eventId, "all" as const]));
  }
  const memberships = await database.eventMember.findMany({
    where: { userId, eventId: { in: access.eventIds } },
    select: { eventId: true, eventGroup: { select: { takServerGroups: true } } },
  });
  return new Map(
    memberships.map(({ eventId, eventGroup }) => {
      const groups = (eventGroup.takServerGroups as string[]).filter((group) => group.length > 0);
      return [eventId, new Set(groups.length > 0 ? groups : [DEFAULT_GROUP])];
    }),
  );
}

/**
 * Whether traffic may flow between two connections: they share an active event, and within it at
 * least one TAK server group, unless one side is an administrator for that event.
 */
export function scopesOverlap(a: CotScope, b: CotScope): boolean {
  for (const [eventId, groupsA] of a) {
    const groupsB = b.get(eventId);
    if (groupsB === undefined) {
      continue;
    }
    if (groupsA === "all" || groupsB === "all") {
      return true;
    }
    for (const group of groupsA) {
      if (groupsB.has(group)) {
        return true;
      }
    }
  }
  return false;
}
