import type { CotDestinations } from "./cot-event.js";
import { canReach, sharesEvent, type CotScope } from "./cot-scope.js";

/** The newest state of one CoT item (a position or marker), kept in memory for the live view. */
export interface LiveItem {
  uid: string;
  type: string;
  callsign: string | null;
  lat: number;
  lon: number;
  /** Direction of travel in degrees from true north, as the sender reported it. */
  course: number | null;
  /** Ground speed in metres per second, as the sender reported it. */
  speed: number | null;
  time: Date;
  stale: Date;
}

/** At most this many items per connection, so one client cannot crowd out the others. */
const MAX_ITEMS_PER_PEER = 200;
/** At most this many items in total, so the server's memory stays bounded. */
const MAX_RETAINED_ITEMS = 10_000;

/** A connected TAK app as the router sees it. */
export interface CotPeer {
  id: string;
  scope: CotScope;
  send(xml: string): void;
  userId: string;
  certificateId: string;
  /** The app's own callsign, once it sent a position. */
  callsign: string | null;
  /** The UID of the app's own position, which other apps use to address it directly. */
  deviceUid: string | null;
  connectedAt: Date;
  lastSeenAt: Date;
}

export interface LiveConnection {
  id: string;
  userId: string;
  callsign: string | null;
  connectedAt: Date;
  lastSeenAt: Date;
}

/** At most this many devices are remembered for contact lists. */
const MAX_KNOWN_DEVICES = 10_000;

/** A TAK app that reported its own position, for the server contact list. */
export interface KnownDevice {
  uid: string;
  callsign: string;
  scope: CotScope;
  lastEventTime: Date;
  /** The connection it currently uses, or `null` once it disconnected. */
  peerId: string | null;
}

/** The current state of an item and where it may be replayed. */
interface RetainedItem {
  item: LiveItem;
  xml: string;
  /** The sender's events when it sent the item. */
  scope: CotScope;
  peerId: string;
  certificateId: string;
}

function isAddressed(receiver: CotPeer, destinations: CotDestinations | null): boolean {
  if (destinations === null) {
    return true;
  }
  return (
    (receiver.callsign !== null && destinations.callsigns.includes(receiver.callsign)) ||
    (receiver.deviceUid !== null && destinations.uids.includes(receiver.deviceUid))
  );
}

/**
 * Forwards CoT between connected apps that share an active event, or only to the addressed apps
 * of those events when the sender named recipients. Nothing is persisted; the current items of
 * each event live in memory until they are stale, also after their app disconnected, so late
 * joiners and the live view see the whole current picture.
 */
export class CotRouter {
  private readonly peers = new Map<string, CotPeer>();
  /** Current items by UID, oldest update first. */
  private readonly retained = new Map<string, RetainedItem>();
  /** UIDs each connected app last updated, oldest first, for the per-connection limit. */
  private readonly peerItems = new Map<string, Set<string>>();
  /** Devices by UID, least recently heard first; kept after they disconnect. */
  private readonly devices = new Map<string, KnownDevice>();
  private readonly listeners = new Set<(eventIds: CotScope) => void>();

  /** Calls `listener` with the affected events whenever connections or their items change. */
  onChange(listener: (eventIds: CotScope) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private changed(eventIds: CotScope): void {
    for (const listener of this.listeners) {
      listener(eventIds);
    }
  }

  /** Adds a connection and replays the current items of its events, except its own device's. */
  join(peer: CotPeer, now = new Date()): void {
    this.peers.set(peer.id, peer);
    this.peerItems.set(peer.id, new Set());
    this.changed(peer.scope);
    for (const retained of this.current(now)) {
      if (retained.certificateId !== peer.certificateId && canReach(retained.scope, peer.scope)) {
        peer.send(retained.xml);
      }
    }
  }

  leave(peerId: string): void {
    const peer = this.peers.get(peerId);
    this.peers.delete(peerId);
    this.peerItems.delete(peerId);
    for (const device of this.devices.values()) {
      if (device.peerId === peerId) {
        device.peerId = null;
      }
    }
    if (peer !== undefined) {
      this.changed(peer.scope);
    }
  }

  /**
   * Sends an event to the other apps of the sender's events that may see it. With destinations,
   * only the addressed apps of those events receive it, so a direct message never reaches the rest
   * of the event; it does cross TAK groups, because the sender chose the recipient.
   */
  publish(sender: CotPeer, xml: string, destinations: CotDestinations | null = null): void {
    for (const receiver of this.peers.values()) {
      const allowed = destinations === null ? canReach(sender.scope, receiver.scope) : sharesEvent(sender.scope, receiver.scope);
      if (receiver !== sender && allowed && isAddressed(receiver, destinations)) {
        receiver.send(xml);
      }
    }
  }

  /**
   * Sends server-made events, such as mission changes, to the connected apps of one user that
   * report `deviceUid` as their own position UID. Returns how many apps received it.
   */
  sendToDevice(userId: string, deviceUid: string, xml: string): number {
    let sent = 0;
    for (const peer of this.peers.values()) {
      if (peer.userId === userId && peer.deviceUid === deviceUid) {
        peer.send(xml);
        sent += 1;
      }
    }
    return sent;
  }

  /** The newest CoT of an item a connected or disconnected app sent, if it is current. */
  currentXml(uid: string, now = new Date()): string | null {
    const retained = this.retained.get(uid);
    return retained === undefined || retained.item.stale <= now ? null : retained.xml;
  }

  /** Keeps the newest version of an item for replay and the live view. */
  remember(peer: CotPeer, item: LiveItem, xml: string, now = new Date()): void {
    this.retained.delete(item.uid);
    this.retained.set(item.uid, { item, xml, scope: peer.scope, peerId: peer.id, certificateId: peer.certificateId });

    const owned = this.peerItems.get(peer.id) ?? new Set<string>();
    owned.delete(item.uid);
    owned.add(item.uid);
    this.peerItems.set(peer.id, owned);
    if (owned.size > MAX_ITEMS_PER_PEER) {
      const oldest = owned.values().next().value;
      if (oldest !== undefined) {
        owned.delete(oldest);
        if (this.retained.get(oldest)?.peerId === peer.id) {
          this.retained.delete(oldest);
        }
      }
    }
    if (this.retained.size > MAX_RETAINED_ITEMS) {
      this.dropStale(now);
    }
    if (this.retained.size > MAX_RETAINED_ITEMS) {
      const oldest = this.retained.keys().next().value;
      if (oldest !== undefined) {
        this.retained.delete(oldest);
      }
    }
    this.changed(peer.scope);
  }

  /** Records an app's own position report for the contact list of its events. */
  identify(peer: CotPeer, now = new Date()): void {
    if (peer.deviceUid === null || peer.callsign === null) {
      return;
    }
    this.devices.delete(peer.deviceUid);
    this.devices.set(peer.deviceUid, { uid: peer.deviceUid, callsign: peer.callsign, scope: peer.scope, lastEventTime: now, peerId: peer.id });
    if (this.devices.size > MAX_KNOWN_DEVICES) {
      const oldest = this.devices.keys().next().value;
      if (oldest !== undefined) {
        this.devices.delete(oldest);
      }
    }
  }

  /** Apps the viewer may see in its events, connected or not, most recently heard first. */
  contacts(viewer: CotScope): KnownDevice[] {
    return [...this.devices.values()].filter(({ scope }) => canReach(scope, viewer)).reverse();
  }

  /** Removes items a client deleted, so they are not replayed to later joiners. */
  forget(peer: CotPeer, uids: string[]): void {
    for (const uid of uids) {
      const retained = this.retained.get(uid);
      if (retained !== undefined && canReach(retained.scope, peer.scope)) {
        this.retained.delete(uid);
      }
    }
    this.changed(peer.scope);
  }

  /** What is happening in one event right now: its connected apps and its current, not yet stale items. */
  snapshot(eventId: string, now = new Date()): { connections: LiveConnection[]; items: LiveItem[] } {
    const peers = [...this.peers.values()].filter(({ scope }) => scope.has(eventId));
    return {
      connections: peers.map(({ id, userId, callsign, connectedAt, lastSeenAt }) => ({ id, userId, callsign, connectedAt, lastSeenAt })),
      items: this.current(now)
        .filter(({ scope }) => scope.has(eventId))
        .map(({ item }) => item),
    };
  }

  size(): number {
    return this.peers.size;
  }

  private current(now: Date): RetainedItem[] {
    this.dropStale(now);
    return [...this.retained.values()];
  }

  private dropStale(now: Date): void {
    for (const [uid, retained] of this.retained) {
      if (retained.item.stale <= now) {
        this.retained.delete(uid);
      }
    }
  }
}

/** The router of this Core process; the live view reads from the same instance the stream writes to. */
export const cotRouter = new CotRouter();
