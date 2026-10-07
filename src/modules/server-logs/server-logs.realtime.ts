import type { IncomingHttpHeaders, Server as HttpServer } from "node:http";
import { Server } from "socket.io";
import { requirePermission } from "../../shared/auth/permission-check.js";
import { authenticateSession } from "../../shared/auth/authorization.js";
import type { UserPrincipal } from "../../shared/auth/principal.js";
import { config } from "../../shared/config/config.js";
import { recentLogs, type RecentLogBuffer } from "../../shared/logging/recent-logs.js";
import { toServerLogEntry } from "./server-logs.service.js";

/** Socket.IO endpoint of Core, served next to the API on the same origin. */
export const REALTIME_PATH = "/api/realtime";
export const SERVER_LOGS_NAMESPACE = "/server-logs";

/** Open viewers are checked again this often, so revoked access ends a running stream. */
const RECHECK_MS = 60_000;

const publicOrigin = new URL(config.publicOrigin).origin;

/**
 * Same rule as `rejectCrossSiteRequests` for the API: a browser marks requests from other sites
 * with a foreign `Origin` or `Sec-Fetch-Site: cross-site`, and every WebSocket handshake carries
 * `Origin`. Same-origin polling GETs may omit `Origin`; another site cannot read their responses.
 */
function isSameSiteRequest(headers: IncomingHttpHeaders): boolean {
  const origin = headers.origin;
  return (origin === undefined || origin === publicOrigin) && headers["sec-fetch-site"] !== "cross-site";
}

async function authorizeViewer(headers: IncomingHttpHeaders): Promise<UserPrincipal> {
  const principal = await authenticateSession(headers);
  await requirePermission(principal, "server-logs.read");
  return principal;
}

/**
 * Pushes each new Core log line to signed-in viewers with `server-logs.read`. The history comes
 * from `GET /server-logs`; this socket only adds lines as they are written.
 *
 * Browsers send cookies on cross-site WebSocket handshakes and WebSockets have no CORS, so a
 * request from another site is refused before the session cookie is looked at.
 */
export function attachRealtime(httpServer: HttpServer, buffer: RecentLogBuffer = recentLogs): Server {
  const io = new Server(httpServer, {
    path: REALTIME_PATH,
    serveClient: false,
    // Viewers only listen; nothing large ever needs to arrive from a browser.
    maxHttpBufferSize: 4096,
    allowRequest: (request, callback) => {
      callback(null, isSameSiteRequest(request.headers));
    },
  });

  // No feature uses the main namespace.
  io.use((_socket, next) => {
    next(new Error("Unknown namespace"));
  });

  const serverLogs = io.of(SERVER_LOGS_NAMESPACE);
  serverLogs.use((socket, next) => {
    authorizeViewer(socket.request.headers).then(
      () => {
        next();
      },
      () => {
        next(new Error("Access denied"));
      },
    );
  });

  serverLogs.on("connection", (socket) => {
    const unsubscribe = buffer.subscribe((line) => {
      socket.emit("line", toServerLogEntry(line));
    });
    const recheck = setInterval(() => {
      authorizeViewer(socket.request.headers).catch(() => socket.disconnect(true));
    }, RECHECK_MS);
    socket.on("disconnect", () => {
      unsubscribe();
      clearInterval(recheck);
    });
  });

  return io;
}
