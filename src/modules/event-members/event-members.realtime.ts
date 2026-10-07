import type { Server } from "socket.io";
import { authenticateSession } from "../../shared/auth/authorization.js";
import { authorizeNamespace } from "../../shared/realtime/realtime-server.js";
import { requireEventPermission } from "../events/event-access.js";
import { onEventChange } from "../events/event-changes.js";

export const EVENT_MEMBERS_NAMESPACE = "/event-members";

/** Members, their groups and roles, and synchronization issues, e.g. from an integration's API calls. */
const MEMBER_PATH = /^(?:members|external-members|sync-issues|groups|roles)(?:\/|$)/;

/**
 * Tells open member views of an event that its members changed, so they reload the list. The
 * client names the event in the handshake `auth` payload and needs `members.read` on it.
 */
export function attachEventMemberStream(io: Server): void {
  const namespace = io.of(EVENT_MEMBERS_NAMESPACE);
  authorizeNamespace(namespace, async (socket) => {
    const eventId: unknown = (socket.handshake.auth as Record<string, unknown>).eventId;
    if (typeof eventId !== "string" || eventId.length > 64) {
      throw new Error("Missing event");
    }
    await requireEventPermission(await authenticateSession(socket.request.headers), eventId, "members.read");
    await socket.join(eventId.toLowerCase());
  });

  onEventChange(io.httpServer, ({ eventId, path, tabId }) => {
    if (MEMBER_PATH.test(path)) {
      namespace.to(eventId).emit("changed", { eventId, tabId });
    }
  });
}
