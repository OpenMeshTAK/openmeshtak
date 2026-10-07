import type { Server } from "socket.io";
import { authenticateSession } from "../../shared/auth/authorization.js";
import { database } from "../../shared/database/database.js";
import { authorizeNamespace } from "../../shared/realtime/realtime-server.js";
import { onEventChange } from "../events/event-changes.js";

export const MY_EVENT_NAMESPACE = "/my-event";

/**
 * Changes that can alter what a member's dashboard shows: published configuration and Data
 * Package revisions, package audiences and delivery, released or rotated channels, the member's
 * own entry, group or role, and the event's status. Draft editing is not among them.
 */
const PROFILE_PATH =
  /^(?:|activate|archive|reactivate|configuration-revisions|members|groups|roles|tak\/configuration)(?:\/|$)|^data-packages\/[0-9a-f-]{36}\/(?:revisions|audience|tak-delivery)(?:\/|$)|^meshtastic\/channels\/[0-9a-f-]{36}\/(?:release|psk)(?:\/|$)/;

/**
 * Tells a member's open dashboard that their event setup may have changed, so it reloads the
 * profile. Only members of the event may listen; the notice carries no member data.
 */
export function attachProfileUpdateStream(io: Server): void {
  const namespace = io.of(MY_EVENT_NAMESPACE);
  authorizeNamespace(namespace, async (socket) => {
    const eventId: unknown = (socket.handshake.auth as Record<string, unknown>).eventId;
    if (typeof eventId !== "string" || eventId.length > 64) {
      throw new Error("Missing event");
    }
    const principal = await authenticateSession(socket.request.headers);
    const membership = await database.eventMember.findFirst({ where: { eventId, userId: principal.id }, select: { id: true } });
    if (membership === null) {
      throw new Error("Not a member");
    }
    await socket.join(eventId.toLowerCase());
  });

  onEventChange(io.httpServer, ({ eventId, path }) => {
    if (PROFILE_PATH.test(path)) {
      namespace.to(eventId).emit("updated", { eventId });
    }
  });
}
