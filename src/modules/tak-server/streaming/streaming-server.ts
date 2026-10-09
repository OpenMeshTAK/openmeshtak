import { randomUUID } from "node:crypto";
import { StringDecoder } from "node:string_decoder";
import { createServer, type Server, type TLSSocket, type TlsOptions } from "node:tls";
import { logger } from "../../../shared/logging/logger.js";
import { authenticateTakClient, type AuthenticatedTakClient } from "../client-authentication.js";
import { noteCertificateConnected, noteCertificateDevice } from "../client-certificates.service.js";
import { takConnections } from "../tak-connections.js";
import { trafficRecorder } from "../traffic-recording.js";
import { parseCotEvent, pongFor, protocolResponse, protocolSupportOffer } from "./cot-event.js";
import { CotFrameError, CotFrameReader, ProtobufFrameReader, frameTakMessage } from "./cot-frames.js";
import { takMessageToXml, xmlToTakMessage } from "./cot-protobuf.js";
import { cotRouter, type CotPeer, type CotRouter } from "./cot-router.js";
import { cotScopeFor } from "./cot-scope.js";
import { takGroupActivity } from "../tak-group-activity.js";
import { writeFromStream } from "../../missions/mission-writes.js";

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

/** How a connection encodes CoT: XML until the client switches to TAK Protocol version 1. */
type StreamEncoding = "xml" | "protobuf";

/** The last conversion, because one published event is sent to many Protobuf clients in a row. */
let lastConverted: { xml: string; frame: Buffer | null } | null = null;

function protobufFrame(xml: string): Buffer | null {
  if (lastConverted?.xml !== xml) {
    const payload = xmlToTakMessage(xml);
    lastConverted = { xml, frame: payload === null ? null : frameTakMessage(payload) };
  }
  return lastConverted.frame;
}

function sendTo(socket: TLSSocket, data: string | Buffer): void {
  if (socket.writableLength > MAX_PENDING_BYTES) {
    logger.warn({ event: "tak_stream_slow_client" }, "TAK client too slow; disconnecting");
    socket.destroy();
    return;
  }
  socket.write(data);
}

async function admit(socket: TLSSocket, router: CotRouter): Promise<void> {
  const certificateDer = socket.getPeerCertificate().raw as Buffer | undefined;
  const client = certificateDer === undefined ? null : await authenticateTakClient(certificateDer);
  if (certificateDer === undefined || client === null) {
    socket.destroy();
    return;
  }

  let encoding: StreamEncoding = "xml";
  const deliver = (xml: string): void => {
    if (encoding === "xml") {
      sendTo(socket, xml);
      return;
    }
    const frame = protobufFrame(xml);
    if (frame !== null) {
      sendTo(socket, frame);
    }
  };
  const peer: CotPeer = {
    id: randomUUID(),
    scope: cotScopeFor(client.access),
    send: deliver,
    userId: client.userId,
    certificateId: client.certificate.id,
    callsign: null,
    deviceUid: null,
    connectedAt: new Date(),
    lastSeenAt: new Date(),
  };
  let access = client.access;
  // Groups the app switched off apply once its device UID is known from its own position.
  const updateScope = (current: AuthenticatedTakClient = { ...client, access }): void => {
    access = current.access;
    peer.scope = cotScopeFor(access, takGroupActivity.inactiveFor(peer.userId, peer.deviceUid));
  };
  takConnections.track({ socket, certificateDer, client, onAccessChanged: updateScope });
  router.join(peer);
  const negotiationUid = randomUUID();
  sendTo(socket, protocolSupportOffer(negotiationUid));
  logger.info({ event: "tak_stream_connected", certificateId: client.certificate.id }, "TAK client connected");
  const certificateId = client.certificate.id;
  const noteFailed = (error: unknown): void => {
    logger.warn({ error, event: "tak_certificate_note_failed", certificateId }, "TAK certificate usage could not be recorded");
  };
  noteCertificateConnected(certificateId).catch(noteFailed);
  // Beacons repeat every few seconds; the device is only written when its description changes.
  let notedDevice = "";

  const limiter = new RateLimiter();
  const handle = (xml: string): void => {
    const event = parseCotEvent(xml);
    if (event === null || !limiter.allow()) {
      return;
    }
    peer.lastSeenAt = new Date();
    if (event.isPing) {
      deliver(pongFor(event));
      return;
    }
    if (event.type.startsWith("t-x-takp")) {
      if (event.protocolRequest !== null && encoding === "xml") {
        const accepted = event.protocolRequest === 1;
        // The response is the last XML the client receives; everything after it is framed.
        sendTo(socket, protocolResponse(negotiationUid, accepted));
        if (accepted) {
          encoding = "protobuf";
        }
      }
      return;
    }
    if (event.destinations !== null) {
      // Addressed events, such as direct chat messages, are private between sender and
      // recipients: they are neither replayed, shown in the live view nor recorded. Events for a
      // mission go into the mission, which announces them to its subscribers.
      if (event.destinations.missions.length > 0) {
        writeFromStream(peer.userId, access, peer.deviceUid, event.destinations.missions, event.xml).catch((error: unknown) => {
          logger.error({ error, event: "mission_stream_write_failed" }, "A mission change from a TAK app failed");
        });
      }
      router.publish(peer, event.xml, event.destinations);
      return;
    }
    if (event.isSituationalAwareness) {
      peer.callsign = event.callsign ?? peer.callsign;
      if (peer.deviceUid !== event.uid) {
        peer.deviceUid = event.uid;
        updateScope();
      }
      router.identify(peer);
      const device = {
        name: event.software?.device ?? null,
        app: event.software?.platform ?? null,
        appVersion: event.software?.version ?? null,
        os: event.software?.os ?? null,
        callsign: event.callsign,
      };
      const described = JSON.stringify(device);
      if (described !== notedDevice) {
        notedDevice = described;
        noteCertificateDevice(certificateId, device).catch(noteFailed);
      }
    }
    if (event.deletedUids.length > 0) {
      router.forget(peer, event.deletedUids);
    }
    if (event.isMapItem) {
      const item = {
        uid: event.uid,
        type: event.type,
        callsign: event.callsign,
        lat: event.lat,
        lon: event.lon,
        time: event.time,
        stale: event.stale,
      };
      router.remember(peer, item, event.xml);
      trafficRecorder.record(peer.userId, peer.scope, item, { how: event.how, ce: event.ce, selfReported: event.isSituationalAwareness });
    }
    router.publish(peer, event.xml);
  };

  const xmlFrames = new CotFrameReader();
  const textDecoder = new StringDecoder("utf8");
  const protobufFrames = new ProtobufFrameReader();
  socket.on("data", (chunk: Buffer) => {
    try {
      if (encoding === "xml") {
        for (const xml of xmlFrames.push(textDecoder.write(chunk))) {
          handle(xml);
        }
      } else {
        for (const payload of protobufFrames.push(chunk)) {
          const xml = takMessageToXml(payload);
          if (xml !== null) {
            handle(xml);
          }
        }
      }
    } catch (error: unknown) {
      if (error instanceof CotFrameError) {
        logger.warn({ event: "tak_stream_invalid_frame" }, "TAK client sent an invalid or oversized event");
        socket.destroy();
        return;
      }
      throw error;
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
export function createStreamingServer(tls: TlsOptions, router: CotRouter = cotRouter): Server {
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
