import type { Server } from "socket.io";
import { requirePermission } from "../../shared/auth/permission-check.js";
import { authenticateSession } from "../../shared/auth/authorization.js";
import { authorizeNamespace } from "../../shared/realtime/realtime-server.js";
import { takAcmeManager } from "./acme-manager.js";
import { certificateEvents } from "./client-certificates.js";

export const TAK_SERVER_NAMESPACE = "/tak-server";

/**
 * Keeps the TAK server page of administrators with `tak-server.manage` current: `certificates`
 * when a client certificate was issued or revoked, `acme` when a certificate issuance started or
 * ended. The notices carry nothing; the page reloads what changed through the API.
 */
export function attachTakServerStream(io: Server): void {
  const namespace = io.of(TAK_SERVER_NAMESPACE);
  authorizeNamespace(namespace, async (socket) => {
    await requirePermission(await authenticateSession(socket.request.headers), "tak-server.manage");
  });

  const certificatesChanged = (): void => {
    namespace.emit("certificates");
  };
  const acmeChanged = (): void => {
    namespace.emit("acme");
  };
  certificateEvents.on("issued", certificatesChanged);
  certificateEvents.on("revoked", certificatesChanged);
  takAcmeManager.on("changed", acmeChanged);
  io.httpServer.once("close", () => {
    certificateEvents.off("issued", certificatesChanged);
    certificateEvents.off("revoked", certificatesChanged);
    takAcmeManager.off("changed", acmeChanged);
  });
}
