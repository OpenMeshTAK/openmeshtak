import type { EventGroupView, TakAccess } from "../tak-access.js";

/**
 * The active events a connection belongs to, with its view of each. The event is the outer CoT
 * boundary: nothing crosses into another event. Inside an event the TAK group mode may separate
 * traffic: in the simple mode members see only their own event group; in the advanced mode they
 * receive what is sent into the TAK groups they receive from. Roles that see every group, such as
 * platoon leaders, and administrators with TAK access see and reach everyone in both modes.
 */
export type CotScope = ReadonlyMap<string, EventGroupView>;

const SEES_ALL: EventGroupView = { groupId: null, seesAll: true, receives: null, sends: null };

/** Key of one direction of a TAK group, as switched off in a TAK app. */
export function groupDirectionKey(groupId: string, direction: "in" | "out"): string {
  return `${groupId}:${direction}`;
}

/**
 * The connection's scope. `inactive` holds the group directions the app switched off (see
 * `groupDirectionKey`); they only narrow the advanced mode and never widen anything.
 */
export function cotScopeFor(access: TakAccess, inactive: ReadonlySet<string> = new Set()): CotScope {
  return new Map(
    access.eventIds.map((eventId) => {
      const view = access.views[eventId] ?? SEES_ALL;
      return [
        eventId,
        {
          ...view,
          receives: view.receives?.filter((groupId) => !inactive.has(groupDirectionKey(groupId, "in"))) ?? null,
          sends: view.sends?.filter((groupId) => !inactive.has(groupDirectionKey(groupId, "out"))) ?? null,
        },
      ];
    }),
  );
}

/** Whether the two connections share at least one active event, regardless of groups. */
export function sharesEvent(a: CotScope, b: CotScope): boolean {
  for (const eventId of a.keys()) {
    if (b.has(eventId)) {
      return true;
    }
  }
  return false;
}

function reaches(sender: EventGroupView, receiver: EventGroupView): boolean {
  if (sender.seesAll || receiver.seesAll) {
    return true;
  }
  if (sender.sends !== null && receiver.receives !== null) {
    return sender.sends.some((groupId) => receiver.receives?.includes(groupId) === true);
  }
  return sender.groupId === receiver.groupId;
}

/**
 * Whether traffic from `from` may reach `to` in a shared event: either side sees every group, or
 * in the advanced mode the sender sends into a group the receiver receives from, or in the simple
 * mode both are in the same event group. Leaders therefore see everyone and are seen by everyone.
 */
export function canReach(from: CotScope, to: CotScope): boolean {
  for (const [eventId, sender] of from) {
    const receiver = to.get(eventId);
    if (receiver !== undefined && reaches(sender, receiver)) {
      return true;
    }
  }
  return false;
}
