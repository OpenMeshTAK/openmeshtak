import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import type { AddressInfo } from "node:net";
import { connect, type Server, type TLSSocket } from "node:tls";
import { after, afterEach, beforeEach, describe, it } from "node:test";
import type { Express } from "express";
import { createApp } from "../src/app.js";
import { trustedCertificateAuthorities } from "../src/modules/tak-server/certificate-authority.js";
import { decryptServerKey, currentServerCertificate } from "../src/modules/tak-server/server-certificate.js";
import { CotFrameReader } from "../src/modules/tak-server/streaming/cot-frames.js";
import { createStreamingServer } from "../src/modules/tak-server/streaming/streaming-server.js";
import { database, disconnectDatabase } from "../src/shared/database/database.js";
import { clearDatabase, createEvent, createUser, type TestUser } from "./support/identity.js";
import { enableTakServer, enrollTakClient, type EnrolledClient } from "./support/tak.js";

let app: Express;
let server: Server;
let port: number;
const sockets: TLSSocket[] = [];

function positionEvent(uid: string, type = "a-f-G-U-C"): string {
  const now = new Date().toISOString();
  return (
    `<?xml version="1.0" encoding="UTF-8"?><event version="2.0" uid="${uid}" type="${type}" how="m-g" time="${now}" start="${now}" stale="${now}">` +
    `<point lat="52.4" lon="11.6" hae="50" ce="10" le="10"/><detail><contact callsign="${uid}"/></detail></event>`
  );
}

interface StreamClient {
  socket: TLSSocket;
  received: string[];
  next(predicate: (xml: string) => boolean, timeoutMs?: number): Promise<string | null>;
}

async function open(client: EnrolledClient): Promise<StreamClient> {
  const socket = connect({
    host: "127.0.0.1",
    port,
    servername: "tak.example.org",
    cert: client.certificatePem,
    key: client.privateKeyPem,
    ca: client.caPems,
  });
  sockets.push(socket);
  const received: string[] = [];
  const frames = new CotFrameReader();
  socket.setEncoding("utf8");
  socket.on("data", (chunk: string) => received.push(...frames.push(chunk)));
  socket.on("error", () => undefined);
  await new Promise<void>((resolve, reject) => {
    socket.once("secureConnect", resolve);
    socket.once("error", reject);
  });
  // Give the server a moment to admit the client before traffic flows.
  await new Promise((resolve) => setTimeout(resolve, 150));
  return {
    socket,
    received,
    async next(predicate, timeoutMs = 1000) {
      const deadline = Date.now() + timeoutMs;
      while (Date.now() < deadline) {
        const match = received.find(predicate);
        if (match !== undefined) {
          return match;
        }
        await new Promise((resolve) => setTimeout(resolve, 20));
      }
      return null;
    },
  };
}

async function member(eventId: string, groupId: string, roleId: string, name: string): Promise<TestUser> {
  const user = await createUser(name, []);
  await database.eventMember.create({
    data: { id: randomUUID(), eventId, userId: user.id, eventRoleId: roleId, eventGroupId: groupId, username: name, callsign: name, shortNameNumber: 1 + Math.floor(Math.random() * 1000) },
  });
  return user;
}

async function activeEvent(): Promise<{ eventId: string; groupId: string; roleId: string }> {
  const eventId = await createEvent();
  await database.event.update({ where: { id: eventId }, data: { status: "active" } });
  const roleId = randomUUID();
  const groupId = randomUUID();
  await database.eventRole.create({ data: { id: roleId, eventId, name: "Participant", slug: "participant" } });
  await database.eventGroup.create({ data: { id: groupId, eventId, name: "Bravo", slug: "bravo", shortNamePrefix: "B" } });
  return { eventId, groupId, roleId };
}

void describe("TAK CoT streaming", () => {
  beforeEach(async () => {
    await clearDatabase();
    app = createApp();
    const admin = await createUser("Admin", [{ permission: "tak-server.manage" }]);
    await enableTakServer(app, admin);
    const certificate = await currentServerCertificate("tak.example.org");
    const ca = (await trustedCertificateAuthorities()).map(({ certificatePem }) => certificatePem);
    server = createStreamingServer({ cert: certificate.certificateChainPem, key: decryptServerKey(certificate), ca });
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    port = (server.address() as AddressInfo).port;
  });

  afterEach(async () => {
    for (const socket of sockets.splice(0)) {
      socket.destroy();
    }
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  after(async () => {
    await clearDatabase();
    await disconnectDatabase();
  });

  void it("routes CoT within an event and never into another event", async () => {
    const bravo = await activeEvent();
    const other = await activeEvent();
    const alpha = await open(await enrollTakClient(app, await member(bravo.eventId, bravo.groupId, bravo.roleId, "Alpha")));
    const beta = await open(await enrollTakClient(app, await member(bravo.eventId, bravo.groupId, bravo.roleId, "Beta")));
    const stranger = await open(await enrollTakClient(app, await member(other.eventId, other.groupId, other.roleId, "Stranger")));

    alpha.socket.write(positionEvent("ALPHA-1"));
    assert.ok(await beta.next((xml) => xml.includes('uid="ALPHA-1"')), "same event receives it");
    assert.equal(await stranger.next((xml) => xml.includes('uid="ALPHA-1"'), 300), null, "other event does not");
    assert.equal(await alpha.next((xml) => xml.includes('uid="ALPHA-1"'), 200), null, "no echo to the sender");
  });

  void it("answers pings, replays positions to late joiners and lets administrators see all events", async () => {
    const bravo = await activeEvent();
    const alpha = await open(await enrollTakClient(app, await member(bravo.eventId, bravo.groupId, bravo.roleId, "Alpha")));
    alpha.socket.write(positionEvent("ALPHA-1"));
    alpha.socket.write(positionEvent("ALPHA-1-ping", "t-x-c-t"));
    assert.ok(await alpha.next((xml) => xml.includes('type="t-x-c-t-r"')), "pong");

    const takAdmin = await createUser("Operator", [{ permission: "tak-server.admin-access" }]);
    const operator = await open(await enrollTakClient(app, takAdmin));
    assert.ok(await operator.next((xml) => xml.includes('uid="ALPHA-1"')), "late joiner gets the last position");
  });

  void it("drops malformed events and disconnects revoked certificates", async () => {
    const bravo = await activeEvent();
    const alphaClient = await enrollTakClient(app, await member(bravo.eventId, bravo.groupId, bravo.roleId, "Alpha"));
    const alpha = await open(alphaClient);
    const beta = await open(await enrollTakClient(app, await member(bravo.eventId, bravo.groupId, bravo.roleId, "Beta")));

    alpha.socket.write('<event uid="X" type="a-f-G"><point lat="1"/></event>');
    alpha.socket.write('<event uid="Y" type="a-f-G" time="t" start="t" stale="t"><point lat="1" lon="1"/></event>');
    alpha.socket.write(positionEvent("Z").replace('lat="52.4"', 'lat="152.4"'));
    assert.equal(await beta.next((xml) => /uid="[XYZ]"/.test(xml), 300), null, "invalid events are dropped");

    // Anything before <event>, such as a DOCTYPE, is cut off by the framing and never forwarded.
    alpha.socket.write('<!DOCTYPE x [<!ENTITY a "b">]>' + positionEvent("ALPHA-2"));
    const forwarded = await beta.next((xml) => xml.includes('uid="ALPHA-2"'));
    assert.ok(forwarded);
    assert.doesNotMatch(forwarded, /DOCTYPE|ENTITY/);

    await database.takClientCertificate.updateMany({ where: {}, data: { revokedAt: new Date() } });
    const revoked = await open(alphaClient);
    await new Promise((resolve) => setTimeout(resolve, 200));
    assert.equal(revoked.socket.destroyed || revoked.socket.readyState === "closed", true, "revoked certificate is disconnected");
  });
});
