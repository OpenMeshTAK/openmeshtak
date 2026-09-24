import type { Socket } from "node:net";
import { logger } from "../../shared/logging/logger.js";
import { authenticateTakClient, type AuthenticatedTakClient } from "./client-authentication.js";

const RECHECK_INTERVAL_MS = 10_000;

interface TrackedConnection {
  socket: Socket;
  certificateDer: Buffer;
  client: AuthenticatedTakClient;
  /** Called after a recheck with the client's current access, e.g. to update event routing. */
  onAccessChanged?: (client: AuthenticatedTakClient) => void;
}

/**
 * Every live TAK connection, rechecked against the database every few seconds. Revoking a
 * certificate, disabling access, removing a member or archiving an event therefore ends or narrows
 * the connection within seconds, without hooks in the modules that cause those changes.
 */
class TakConnections {
  private readonly connections = new Set<TrackedConnection>();
  private timer: NodeJS.Timeout | null = null;

  track(connection: TrackedConnection): () => void {
    this.connections.add(connection);
    this.timer ??= setInterval(() => void this.recheckAll(), RECHECK_INTERVAL_MS).unref();
    const untrack = (): void => {
      this.connections.delete(connection);
      if (this.connections.size === 0 && this.timer !== null) {
        clearInterval(this.timer);
        this.timer = null;
      }
    };
    connection.socket.once("close", untrack);
    return untrack;
  }

  /** Ends the connections of one certificate right away, e.g. after it was revoked. */
  disconnectCertificate(certificateId: string): void {
    for (const connection of this.connections) {
      if (connection.client.certificate.id === certificateId) {
        connection.socket.destroy();
      }
    }
  }

  count(): number {
    return this.connections.size;
  }

  async recheckAll(): Promise<void> {
    for (const connection of [...this.connections]) {
      try {
        const current = await authenticateTakClient(connection.certificateDer);
        if (current === null) {
          logger.info({ event: "tak_connection_revoked", certificateId: connection.client.certificate.id }, "TAK connection ended");
          connection.socket.destroy();
        } else {
          connection.client = current;
          connection.onAccessChanged?.(current);
        }
      } catch (error: unknown) {
        logger.error({ error, event: "tak_connection_recheck_failed" }, "TAK connection recheck failed");
      }
    }
  }
}

export const takConnections = new TakConnections();
