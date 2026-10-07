import { EventEmitter } from "node:events";
import type { Server } from "socket.io";
import { authenticateSession } from "../../shared/auth/authorization.js";
import { authorizeNamespace } from "../../shared/realtime/realtime-server.js";

export const SESSION_NAMESPACE = "/session";

/** Raised when a user's browser sessions were ended, e.g. revoked by an administrator or the account was disabled. */
export const sessionNotices = new EventEmitter<{ ended: [userId: string] }>();

/**
 * Every signed-in tab keeps one socket here. When the user's sessions end, the tab is asked to
 * check its session right away instead of failing on the next click; the notice itself carries
 * nothing, the tab asks Core. A reconnect after a Core restart also lets the tab check the
 * server version.
 */
export function attachSessionStream(io: Server): void {
  const namespace = io.of(SESSION_NAMESPACE);
  authorizeNamespace(namespace, async (socket) => {
    const principal = await authenticateSession(socket.request.headers);
    await socket.join(principal.id);
  });

  const askToCheck = (userId: string): void => {
    namespace.to(userId).emit("check-session");
  };
  sessionNotices.on("ended", askToCheck);
  io.httpServer.once("close", () => sessionNotices.off("ended", askToCheck));
}
