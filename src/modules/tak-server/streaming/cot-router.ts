import { scopesOverlap, type CotScope } from "./cot-scope.js";

/** The newest state of one CoT item (a position or marker), kept in memory for the live view. */
export interface LiveItem {
  uid: string;
  type: string;
  callsign: string | null;
  lat: number;
  lon: number;
  time: Date;
  stale: Date;
}

/** At most this many items per connection, so a client cannot grow server memory without bound. */
const MAX_ITEMS_PER_PEER = 200;

/** A connected TAK app as the router sees it. */
export interface CotPeer {
  id: string;
  scope: CotScope;
  send(xml: string): void;
  /** The app's latest self-reported position, replayed to clients that connect later. */
  lastSituationalAwareness: string | null;
  userId: string;
  certificateId: string;
  /** The app's own callsign, once it sent a position. */
  callsign: string | null;
  connectedAt: Date;
  lastSeenAt: Date;
  items: Map<string, LiveItem>;
}

export interface LiveConnection {
  id: string;
  userId: string;
  callsign: string | null;
  connectedAt: Date;
  lastSeenAt: Date;
}

/**
 * Forwards CoT between connected apps that share an event and a TAK server group. Nothing is
 * persisted; the latest items per connection only live in memory, so late joiners and the live
 * view see what is current.
 */
export class CotRouter {
  private readonly peers = new Map<string, CotPeer>();

  join(peer: CotPeer): void {
    this.peers.set(peer.id, peer);
    for (const other of this.peers.values()) {
      if (other !== peer && other.lastSituationalAwareness !== null && scopesOverlap(peer.scope, other.scope)) {
        peer.send(other.lastSituationalAwareness);
      }
    }
  }

  leave(peerId: string): void {
    this.peers.delete(peerId);
  }

  publish(sender: CotPeer, xml: string): void {
    for (const receiver of this.peers.values()) {
      if (receiver !== sender && scopesOverlap(sender.scope, receiver.scope)) {
        receiver.send(xml);
      }
    }
  }

  /** Remembers the newest version of an item, dropping the oldest when the limit is reached. */
  remember(peer: CotPeer, item: LiveItem): void {
    peer.items.delete(item.uid);
    peer.items.set(item.uid, item);
    if (peer.items.size > MAX_ITEMS_PER_PEER) {
      const oldest = peer.items.keys().next().value;
      if (oldest !== undefined) {
        peer.items.delete(oldest);
      }
    }
  }

  /** What is happening in one event right now: its connected apps and their current, not yet stale items. */
  snapshot(eventId: string, now = new Date()): { connections: LiveConnection[]; items: LiveItem[] } {
    const peers = [...this.peers.values()].filter(({ scope }) => scope.has(eventId));
    return {
      connections: peers.map(({ id, userId, callsign, connectedAt, lastSeenAt }) => ({ id, userId, callsign, connectedAt, lastSeenAt })),
      items: peers.flatMap(({ items }) => [...items.values()].filter(({ stale }) => stale > now)),
    };
  }

  size(): number {
    return this.peers.size;
  }
}

/** The router of this Core process; the live view reads from the same instance the stream writes to. */
export const cotRouter = new CotRouter();
