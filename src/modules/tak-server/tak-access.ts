import { userHasPermission } from "../../shared/auth/permission-check.js";
import { database } from "../../shared/database/database.js";

/**
 * What a TAK user may reach right now. Members reach the active events they belong to;
 * administrators with `tak-server.admin-access` reach every active event and every published Data
 * Package. It is recomputed from the database, never cached in a certificate.
 */
export interface TakAccess {
  admin: boolean;
  /** Active events the user is a member of; every active event for administrators. */
  eventIds: string[];
}

export async function takAccessFor(userId: string): Promise<TakAccess> {
  const admin = await userHasPermission(userId, "tak-server.admin-access");
  const events = await database.event.findMany({
    where: admin ? { status: "active" } : { status: "active", members: { some: { userId } } },
    select: { id: true },
    orderBy: { id: "asc" },
  });
  return { admin, eventIds: events.map(({ id }) => id) };
}

export function hasAnyTakAccess(access: TakAccess): boolean {
  return access.admin || access.eventIds.length > 0;
}
