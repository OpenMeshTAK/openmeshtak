import { randomUUID } from "node:crypto";
import { createServer, type Server, type TLSSocket, type TlsOptions } from "node:tls";
import { logger } from "../../../shared/logging/logger.js";
import { authenticateTakClient, type AuthenticatedTakClient } from "../client-authentication.js";
import { takConnections } from "../tak-connections.js";
import { parseCotEvent, pongFor } from "./cot-event.js";
import { CotFrameError, CotFrameReader } from "./cot-frames.js";
import { CotRouter, type CotPeer } from "./cot-router.js";
import { cotScopeFor } from "./cot-scope.js";

/** Sustained events per second a client may send; bursts up to the bucket size are fine. */
const EVENTS_PER_SECOND = 20;
const BURST = 100;
/** A receiver that falls this far behind is disconnected instead of buffering without bound. */
const MAX_PENDING_BYTES = 2 * 1024 * 1024;

class RateLimiter {
  private tokens = BURST;
  private updated = Date.now();

  allow(): boolean {
    const now = Date.now();
    this.tokens = Math.min(BURST, this.tokens + ((now - this.updated) / 1000) * EVENTS_PER_SECOND);
    this.updated = now;
    if (this.tokens < 1) {
      return false;
    }
    this.tokens -= 1;
    return true;
  }
}

function sendTo(socket: TLSSocket, xml: string): void {
  if (socket.writableLength > MAX_PENDING_BYTES) {
    logger.warn({ event: "tak_stream_slow_client" }, "TAK client too slow; disconnecting");
    socket.destroy();
    return;
  }
  socket.write(xml);
}

async function admit(socket: TLSSocket, router: CotRouter): Promise<void> {
  const certificateDer = socket.getPeerCertificate().raw as Buffer | undefined;
  const client = certificateDer === undefined ? null : await authenticateTakClient(certificateDer);
  if (certificateDer === undefined || client === null) {
    socket.destroy();
    return;
  }

  const peer: CotPeer = {
    id: randomUUID(),
    scope: await cotScopeFor(client.userId, client.access),
    send: (xml) => sendTo(socket, xml),
    lastSituationalAwareness: null,
  };
  const updateScope = (current: AuthenticatedTakClient): void => {
    void cotScopeFor(current.userId, current.access).then((scope) => {
      peer.scope = scope;
    });
  };
  takConnections.track({ socket, certificateDer, client, onAccessChanged: updateScope });
  router.join(peer);
  logger.info({ event: "tak_stream_connected", certificateId: client.certificate.id }, "TAK client connected");

  const frames = new CotFrameReader();
  const limiter = new RateLimiter();
  socket.setEncoding("utf8");
  socket.on("data", (chunk: string) => {
    let events: string[];
    try {
      events = frames.push(chunk);
    } catch (error: unknown) {
      if (error instanceof CotFrameError) {
        logger.warn({ event: "tak_stream_oversized_event" }, "TAK client sent an oversized event");
        socket.destroy();
        return;
      }
      throw error;
    }
    for (const raw of events) {
      const event = parseCotEvent(raw);
      if (event === null || !limiter.allow()) {
        continue;
      }
      if (event.isPing) {
        sendTo(socket, pongFor(event));
        continue;
      }
      if (event.isSituationalAwareness) {
        peer.lastSituationalAwareness = event.xml;
      }
      router.publish(peer, event.xml);
    }
  });
  socket.on("close", () => {
    router.leave(peer.id);
  });
}

/**
 * The CoT streaming listener. TLS requires a client certificate from one of the trusted
 * OpenMeshTak CAs; Core then checks that certificate against its records and the user's current
 * access before any event is accepted or delivered.
 */
export function createStreamingServer(tls: TlsOptions, router = new CotRouter()): Server {
  const server = createServer({ ...tls, requestCert: true, rejectUnauthorized: true }, (socket) => {
    socket.on("error", () => {
      socket.destroy();
    });
    admit(socket, router).catch((error: unknown) => {
      logger.error({ error, event: "tak_stream_admit_failed" }, "TAK client could not be admitted");
      socket.destroy();
    });
  });
  server.on("tlsClientError", () => {
    // Handshake failures, such as missing or foreign client certificates, are expected noise.
  });
  return server;
}
