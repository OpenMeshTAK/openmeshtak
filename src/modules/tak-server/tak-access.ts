import { userHasPermission } from "../../shared/auth/permission-check.js";
import { database } from "../../shared/database/database.js";

/**
 * How a user sees one event's TAK traffic. `seesAll` is true when the event does not separate
 * TAK groups, when the user's role sees every group and for administrators. Otherwise, in the
 * simple group mode the user sees only `groupId`; in the advanced mode `receives` and `sends`
 * hold the TAK groups the member receives from and sends into (`null` in the other modes).
 */
export interface EventGroupView {
  groupId: string | null;
  seesAll: boolean;
  receives: string[] | null;
  sends: string[] | null;
}

/**
 * What a TAK user may reach right now. Members reach the active events they belong to;
 * administrators with `tak-server.admin-access` reach every active event and every published Data
 * Package. It is recomputed from the database, never cached in a certificate.
 */
export interface TakAccess {
  admin: boolean;
  /** Active events the user is a member of; every active event for administrators. */
  eventIds: string[];
  /** The user's view of each event in `eventIds`. */
  views: Record<string, EventGroupView>;
}

export async function takAccessFor(userId: string): Promise<TakAccess> {
  const user = await database.domainUser.findUnique({ where: { id: userId }, select: { disabledAt: true } });
  if (user === null || user.disabledAt !== null) {
    return { admin: false, eventIds: [], views: {} };
  }
  const admin = await userHasPermission(userId, "tak-server.admin-access");
  const events = await database.event.findMany({
    where: admin ? { status: "active" } : { status: "active", members: { some: { userId } } },
    select: {
      id: true,
      takConfiguration: { select: { groupMode: true } },
      members: {
        where: { userId },
        select: {
          eventGroupId: true,
          eventRole: { select: { seesAllTakGroups: true } },
          takGroups: { select: { groupId: true, receive: true, send: true } },
        },
      },
    },
    orderBy: { id: "asc" },
  });
  const views: Record<string, EventGroupView> = {};
  for (const event of events) {
    const membership = event.members[0];
    const mode = event.takConfiguration?.groupMode ?? "off";
    const advanced = mode === "advanced";
    const groups = advanced ? (membership?.takGroups ?? []) : [];
    views[event.id] = {
      groupId: membership?.eventGroupId ?? null,
      seesAll: admin || mode === "off" || membership === undefined || membership.eventRole.seesAllTakGroups,
      receives: advanced ? groups.filter(({ receive }) => receive).map(({ groupId }) => groupId) : null,
      sends: advanced ? groups.filter(({ send }) => send).map(({ groupId }) => groupId) : null,
    };
  }
  return { admin, eventIds: events.map(({ id }) => id), views };
}

export function hasAnyTakAccess(access: TakAccess): boolean {
  return access.admin || access.eventIds.length > 0;
}
