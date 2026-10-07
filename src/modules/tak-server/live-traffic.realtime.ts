import type { Server, Socket } from "socket.io";
import { authenticateSession } from "../../shared/auth/authorization.js";
import type { UserPrincipal } from "../../shared/auth/principal.js";
import { authorizeNamespace } from "../../shared/realtime/realtime-server.js";
import { requireEventPermission } from "../events/event-access.js";
import { getLiveTakTraffic } from "./live-traffic.service.js";
import { cotRouter, type CotRouter } from "./streaming/cot-router.js";

export const TAK_TRAFFIC_NAMESPACE = "/tak-traffic";

/** Changes arriving faster than this are combined into one update. */
const THROTTLE_MS = 500;
/** Items also go stale without new traffic, so viewers get a fresh snapshot this often. */
const REFRESH_MS = 10_000;

interface ViewerData {
  principal: UserPrincipal;
  eventId: string;
}

/**
 * Pushes an event's live TAK traffic, the same snapshot as `GET /events/{eventId}/tak-traffic`,
 * to viewers with `tak-traffic.view` on that event. The client names the event in the handshake
 * `auth` payload; one socket watches one event.
 */
export function attachTakTrafficStream(io: Server, router: CotRouter = cotRouter): void {
  const namespace = io.of(TAK_TRAFFIC_NAMESPACE);
  authorizeNamespace(namespace, async (socket: Socket) => {
    const eventId: unknown = (socket.handshake.auth as Record<string, unknown>).eventId;
    if (typeof eventId !== "string" || eventId.length > 64) {
      throw new Error("Missing event");
    }
    const principal = await authenticateSession(socket.request.headers);
    await requireEventPermission(principal, eventId, "tak-traffic.view");
    socket.data = { principal, eventId } satisfies ViewerData;
  });

  namespace.on("connection", (socket) => {
    const { principal, eventId } = socket.data as ViewerData;
    let pending: ReturnType<typeof setTimeout> | undefined;

    const send = (): void => {
      pending = undefined;
      getLiveTakTraffic(principal, eventId, router).then(
        (traffic) => socket.emit("traffic", traffic),
        () => socket.disconnect(true),
      );
    };
    const schedule = (): void => {
      pending ??= setTimeout(send, THROTTLE_MS);
    };

    const unsubscribe = router.onChange((eventIds) => {
      if (eventIds.has(eventId)) {
        schedule();
      }
    });
    const refresh = setInterval(schedule, REFRESH_MS);
    send();

    socket.on("disconnect", () => {
      unsubscribe();
      clearInterval(refresh);
      clearTimeout(pending);
    });
  });
}
