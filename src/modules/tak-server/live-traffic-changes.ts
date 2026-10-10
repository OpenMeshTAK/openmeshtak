import type { LiveTakConnectionDto, LiveTakItemDto, LiveTakTrafficChangesDto, LiveTakTrafficDto } from "./live-traffic.dto.js";

/** `lastSeenAt` moves with every event; compared at this resolution it changes a connection only now and then. */
const LAST_SEEN_RESOLUTION_MS = 30_000;

/** What one viewer last received, as a comparable fingerprint per connection and item. */
export interface SentTraffic {
  connections: Map<string, string>;
  items: Map<string, string>;
}

function connectionKey(connection: LiveTakConnectionDto): string {
  const lastSeen = Math.floor(Date.parse(connection.lastSeenAt) / LAST_SEEN_RESOLUTION_MS);
  return JSON.stringify({ ...connection, lastSeenAt: lastSeen });
}

function itemKey(item: LiveTakItemDto): string {
  return JSON.stringify(item);
}

export function fingerprint(traffic: LiveTakTrafficDto): SentTraffic {
  return {
    connections: new Map(traffic.connections.map((connection) => [connection.id, connectionKey(connection)])),
    items: new Map(traffic.items.map((item) => [item.uid, itemKey(item)])),
  };
}

function diff<T>(previous: Map<string, string>, current: readonly T[], idOf: (value: T) => string, keyOf: (value: T) => string): { upserted: T[]; removed: string[] } {
  const seen = new Set<string>();
  const upserted: T[] = [];
  for (const value of current) {
    const id = idOf(value);
    seen.add(id);
    if (previous.get(id) !== keyOf(value)) upserted.push(value);
  }
  return { upserted, removed: [...previous.keys()].filter((id) => !seen.has(id)) };
}

/**
 * What changed since the viewer's last update: new or changed connections and items in full, and
 * the ids of those that are gone. With hundreds of apps a refresh then carries the few positions
 * that moved instead of the whole picture. Returns null when nothing changed.
 */
export function trafficChanges(previous: SentTraffic, current: LiveTakTrafficDto): LiveTakTrafficChangesDto | null {
  const connections = diff(previous.connections, current.connections, ({ id }) => id, connectionKey);
  const items = diff(previous.items, current.items, ({ uid }) => uid, itemKey);
  const empty = connections.upserted.length + connections.removed.length + items.upserted.length + items.removed.length === 0;
  return empty ? null : { connections, items };
}
