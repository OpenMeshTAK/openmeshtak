import type { IncomingHttpHeaders, Server as HttpServer } from "node:http";
import { Server, type Namespace, type Socket } from "socket.io";
import { config } from "../config/config.js";

/** Socket.IO endpoint of Core, served next to the API on the same origin. */
export const REALTIME_PATH = "/api/realtime";

/** The message every refused namespace handshake gets, so clients cannot probe why. */
export const ACCESS_DENIED = "Access denied";

/** Open sockets are authorized again this often, so revoked access ends a running stream. */
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

/**
 * The Socket.IO server for live updates in the Web app. Browsers send cookies on cross-site
 * WebSocket handshakes and WebSockets have no CORS, so a request from another site is refused
 * before any session cookie is looked at. Features add their own namespaces.
 */
export function createRealtimeServer(httpServer: HttpServer): Server {
  const io = new Server(httpServer, {
    path: REALTIME_PATH,
    serveClient: false,
    // Browsers only listen; nothing large ever needs to arrive from them.
    maxHttpBufferSize: 4096,
    allowRequest: (request, callback) => {
      callback(null, isSameSiteRequest(request.headers));
    },
  });

  // No feature uses the main namespace.
  io.use((_socket, next) => {
    next(new Error("Unknown namespace"));
  });
  return io;
}

/**
 * Lets a socket into the namespace only when `authorize` resolves, and repeats the check while it
 * stays connected. `authorize` reads the handshake (session cookie, `auth` payload) and may store
 * what it resolved in `socket.data`.
 */
export function authorizeNamespace(namespace: Namespace, authorize: (socket: Socket) => Promise<void>): void {
  namespace.use((socket, next) => {
    authorize(socket).then(
      () => {
        next();
      },
      () => {
        next(new Error(ACCESS_DENIED));
      },
    );
  });

  namespace.on("connection", (socket) => {
    const recheck = setInterval(() => {
      authorize(socket).catch(() => socket.disconnect(true));
    }, RECHECK_MS);
    socket.on("disconnect", () => {
      clearInterval(recheck);
    });
  });
}
