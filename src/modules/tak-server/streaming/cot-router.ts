import { scopesOverlap, type CotScope } from "./cot-scope.js";

/** A connected TAK app as the router sees it. */
export interface CotPeer {
  id: string;
  scope: CotScope;
  send(xml: string): void;
  /** The app's latest self-reported position, replayed to clients that connect later. */
  lastSituationalAwareness: string | null;
}

/**
 * Forwards CoT between connected apps that share an event and a TAK server group. Nothing is
 * persisted; the latest position per connection only lives in memory so late joiners see who is
 * already there.
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

  size(): number {
    return this.peers.size;
  }
}
