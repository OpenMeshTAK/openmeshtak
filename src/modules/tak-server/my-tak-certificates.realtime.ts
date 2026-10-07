import type { Server } from "socket.io";
import { authenticateSession } from "../../shared/auth/authorization.js";
import { authorizeNamespace } from "../../shared/realtime/realtime-server.js";
import { certificateEvents } from "./client-certificates.js";

export const MY_TAK_CERTIFICATES_NAMESPACE = "/my-tak-certificates";

export interface IssuedCertificateNotice {
  certificateId: string;
  clientUid: string | null;
}

/**
 * Tells a signed-in user's open browser tabs when one of their TAK apps received a certificate,
 * for example right after scanning the enrollment QR code. Each user only hears about their own.
 */
export function attachMyTakCertificateStream(io: Server): void {
  const namespace = io.of(MY_TAK_CERTIFICATES_NAMESPACE);
  authorizeNamespace(namespace, async (socket) => {
    const principal = await authenticateSession(socket.request.headers);
    await socket.join(principal.id);
  });

  const announce = ({ id, userId, clientUid }: { id: string; userId: string; clientUid: string | null }): void => {
    namespace.to(userId).emit("issued", { certificateId: id, clientUid } satisfies IssuedCertificateNotice);
  };
  certificateEvents.on("issued", announce);
  io.httpServer.once("close", () => certificateEvents.off("issued", announce));
}
