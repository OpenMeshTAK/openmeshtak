import type { Server } from "socket.io";
import { requirePermission } from "../../shared/auth/permission-check.js";
import { authenticateSession } from "../../shared/auth/authorization.js";
import { recentLogs, type RecentLogBuffer } from "../../shared/logging/recent-logs.js";
import { authorizeNamespace } from "../../shared/realtime/realtime-server.js";
import { toServerLogEntry } from "./server-logs.service.js";

export const SERVER_LOGS_NAMESPACE = "/server-logs";

/**
 * Pushes each new Core log line to signed-in viewers with `server-logs.read`. The history comes
 * from `GET /server-logs`; this socket only adds lines as they are written.
 */
export function attachServerLogStream(io: Server, buffer: RecentLogBuffer = recentLogs): void {
  const namespace = io.of(SERVER_LOGS_NAMESPACE);
  authorizeNamespace(namespace, async (socket) => {
    await requirePermission(await authenticateSession(socket.request.headers), "server-logs.read");
  });

  namespace.on("connection", (socket) => {
    const unsubscribe = buffer.subscribe((line) => {
      socket.emit("line", toServerLogEntry(line));
    });
    socket.on("disconnect", unsubscribe);
  });
}
