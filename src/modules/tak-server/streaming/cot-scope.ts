import type { TakAccess } from "../tak-access.js";

/**
 * The active events a connection belongs to. In RC1 the event is the only CoT isolation boundary:
 * every connection of an event receives all traffic of that event. Event groups and TAK server
 * groups never filter delivery; teams that must not see each other, such as red and blue, belong
 * in separate events. Administrators with TAK access belong to every active event.
 */
export type CotScope = ReadonlySet<string>;

export function cotScopeFor(access: TakAccess): CotScope {
  return new Set(access.eventIds);
}

/** Whether traffic may flow between two connections: they share at least one active event. */
export function scopesOverlap(a: CotScope, b: CotScope): boolean {
  for (const eventId of a) {
    if (b.has(eventId)) {
      return true;
    }
  }
  return false;
}
