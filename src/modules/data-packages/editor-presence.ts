import type { Namespace, Socket } from "socket.io";
import { database } from "../../shared/database/database.js";

export interface EditorSocketData {
  eventId: string;
  userId: string;
}

/** One open editor tab of an event, as other editors see it. */
export interface EditorPresence {
  /** One entry per tab; the same person may edit in several tabs. */
  id: string;
  userId: string;
  name: string;
  /** Stable per person, so the same person keeps their color in every tab and on the map. */
  color: string;
  packageId: string | null;
  objectId: string | null;
}

/** Distinct on light and dark base maps and next to the default object colors. */
const COLORS = ["#e8590c", "#7048e8", "#0ca678", "#d6336c", "#1c7ed6", "#f08c00", "#5c940d", "#ae3ec9"];
const ID = /^[0-9a-f-]{36}$/;

function colorFor(userId: string): string {
  let hash = 0;
  for (const character of userId) {
    hash = (hash * 31 + character.charCodeAt(0)) >>> 0;
  }
  return COLORS[hash % COLORS.length] ?? COLORS[0]!;
}

function idOrNull(value: unknown): string | null {
  return typeof value === "string" && ID.test(value) ? value : null;
}

/**
 * Who is editing an event right now and what they have selected. Presence lives only in memory
 * and contains names, colors and object IDs of editors who may already read the event's Data
 * Packages. Each tab reports its selection; everyone in the event gets the full list.
 */
export function attachEditorPresence(namespace: Namespace): void {
  const byEvent = new Map<string, Map<string, EditorPresence>>();

  function entriesOf(eventId: string): Map<string, EditorPresence> {
    let entries = byEvent.get(eventId);
    if (entries === undefined) {
      entries = new Map();
      byEvent.set(eventId, entries);
    }
    return entries;
  }

  function broadcast(eventId: string): void {
    namespace.to(eventId).emit("presence", [...(byEvent.get(eventId)?.values() ?? [])]);
  }

  namespace.on("connection", (socket: Socket) => {
    const { eventId, userId } = socket.data as EditorSocketData;
    // A tab may report its selection before its name is loaded; it is kept until then.
    const selection: Pick<EditorPresence, "packageId" | "objectId"> = { packageId: null, objectId: null };

    void database.domainUser
      .findUnique({ where: { id: userId }, select: { displayName: true } })
      .then((user) => {
        if (!socket.connected) {
          return;
        }
        entriesOf(eventId).set(socket.id, {
          id: socket.id,
          userId,
          name: user?.displayName ?? "Unknown user",
          color: colorFor(userId),
          ...selection,
        });
        broadcast(eventId);
      })
      .catch(() => socket.disconnect(true));

    socket.on("presence", (update: unknown) => {
      if (typeof update !== "object" || update === null) {
        return;
      }
      const { packageId, objectId } = update as Record<string, unknown>;
      selection.packageId = idOrNull(packageId);
      selection.objectId = idOrNull(objectId);
      const entry = byEvent.get(eventId)?.get(socket.id);
      if (entry !== undefined) {
        Object.assign(entry, selection);
        broadcast(eventId);
      }
    });

    socket.on("disconnect", () => {
      const entries = entriesOf(eventId);
      entries.delete(socket.id);
      if (entries.size === 0) {
        byEvent.delete(eventId);
      } else {
        broadcast(eventId);
      }
    });
  });
}
