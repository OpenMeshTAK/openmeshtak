import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import type { AddressInfo } from "node:net";
import { connect, type Server, type TLSSocket } from "node:tls";
import { after, afterEach, beforeEach, describe, it } from "node:test";
import type { Express } from "express";
import request from "supertest";
import { createApp } from "../src/app.js";
import { trustedCertificateAuthorities } from "../src/modules/tak-server/certificate-authority.js";
import { decryptServerKey, currentServerCertificate } from "../src/modules/tak-server/server-certificate.js";
import { CotFrameReader, ProtobufFrameReader, frameTakMessage } from "../src/modules/tak-server/streaming/cot-frames.js";
import { takMessageToXml, xmlToTakMessage } from "../src/modules/tak-server/streaming/cot-protobuf.js";
import { purgeExpiredTraffic } from "../src/modules/tak-server/traffic-recording.js";
import { createStreamingServer } from "../src/modules/tak-server/streaming/streaming-server.js";
import { database, disconnectDatabase } from "../src/shared/database/database.js";
import { clearDatabase, createEvent, createUser, type TestUser } from "./support/identity.js";
import { enableTakServer, enrollTakClient, type EnrolledClient } from "./support/tak.js";

let app: Express;
let server: Server;
let port: number;
const sockets: TLSSocket[] = [];

/** An app's own position beacon, which names its software in `takv`. */
function positionEvent(uid: string, type = "a-f-G-U-C"): string {
  return markerEvent(uid, type).replace("<detail>", '<detail><takv platform="ATAK-CIV" version="5.6.0"/>');
}

/** A marker or other item with a callsign but without `takv`. */
function markerEvent(uid: string, type = "a-h-G"): string {
  const now = new Date().toISOString();
  const stale = new Date(Date.now() + 300_000).toISOString();
  return (
    `<?xml version="1.0" encoding="UTF-8"?><event version="2.0" uid="${uid}" type="${type}" how="m-g" time="${now}" start="${now}" stale="${stale}">` +
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

/** A client that negotiates TAK Protocol version 1 and then speaks only framed Protobuf. */
async function openProtobuf(client: EnrolledClient): Promise<StreamClient> {
  const socket = connect({ host: "127.0.0.1", port, servername: "tak.example.org", cert: client.certificatePem, key: client.privateKeyPem, ca: client.caPems });
  sockets.push(socket);
  const received: string[] = [];
  const frames = new ProtobufFrameReader();
  let pending = Buffer.alloc(0);
  let negotiated = false;
  socket.on("data", (chunk: Buffer) => {
    if (negotiated) {
      received.push(...frames.push(chunk).map((payload) => takMessageToXml(payload) ?? "invalid"));
      return;
    }
    pending = Buffer.concat([pending, chunk]);
    const offer = /uid="([^"]+)" type="t-x-takp-v"/.exec(pending.toString("utf8"));
    if (offer !== null && !pending.includes("TakRequest")) {
      const now = new Date().toISOString();
      socket.write(
        `<?xml version="1.0" encoding="UTF-8"?><event version="2.0" uid="${offer[1] ?? ""}" type="t-x-takp-q" how="m-g" time="${now}" start="${now}" stale="${now}">` +
          '<point lat="0.0" lon="0.0" hae="0.0" ce="999999" le="999999"/><detail><TakControl><TakRequest version="1"/></TakControl></detail></event>',
      );
      pending = Buffer.concat([pending, Buffer.from("TakRequest")]);
    }
    const response = pending.indexOf('<TakResponse status="true"/>');
    if (response !== -1) {
      const end = pending.indexOf("</event>", response) + "</event>".length;
      negotiated = true;
      received.push(...frames.push(pending.subarray(end)).map((payload) => takMessageToXml(payload) ?? "invalid"));
    }
  });
  socket.on("error", () => undefined);
  await new Promise<void>((resolve, reject) => {
    socket.once("secureConnect", resolve);
    socket.once("error", reject);
  });
  const deadline = Date.now() + 2000;
  while (!negotiated && Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
  assert.ok(negotiated, "server accepted TAK Protocol version 1");
  return {
    socket,
    received,
    async next(predicate, timeoutMs = 1000) {
      const until = Date.now() + timeoutMs;
      while (Date.now() < until) {
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

  void it("does not filter by event group or TAK server group within an event", async () => {
    const bravo = await activeEvent();
    const charlieId = randomUUID();
    await database.eventGroup.update({ where: { id: bravo.groupId }, data: { takServerGroups: ["Blue"] } });
    await database.eventGroup.create({
      data: { id: charlieId, eventId: bravo.eventId, name: "Charlie", slug: "charlie", shortNamePrefix: "C", takServerGroups: ["Red"] },
    });
    const alpha = await open(await enrollTakClient(app, await member(bravo.eventId, bravo.groupId, bravo.roleId, "Alpha")));
    const charlie = await open(await enrollTakClient(app, await member(bravo.eventId, charlieId, bravo.roleId, "Charlie")));

    alpha.socket.write(positionEvent("ALPHA-GROUPS"));
    assert.ok(await charlie.next((xml) => xml.includes('uid="ALPHA-GROUPS"')), "other group of the same event receives it");
  });

  void it("delivers addressed events only to their recipients and keeps them out of the live view", async () => {
    const bravo = await activeEvent();
    const alpha = await open(await enrollTakClient(app, await member(bravo.eventId, bravo.groupId, bravo.roleId, "Alpha")));
    const beta = await open(await enrollTakClient(app, await member(bravo.eventId, bravo.groupId, bravo.roleId, "Beta")));
    const gamma = await open(await enrollTakClient(app, await member(bravo.eventId, bravo.groupId, bravo.roleId, "Gamma")));
    beta.socket.write(positionEvent("BETA"));
    // A marker has a callsign too, but must not rename the app it came from.
    beta.socket.write(markerEvent("BETA-MARKER"));
    gamma.socket.write(positionEvent("GAMMA"));
    await new Promise((resolve) => setTimeout(resolve, 200));

    const directMessage = (uid: string, dest: string): string =>
      markerEvent(uid, "b-t-f").replace(
        '<detail><contact callsign="' + uid + '"/></detail>',
        `<detail><__chat chatroom="BETA" senderCallsign="ALPHA"/><remarks>hello</remarks><marti>${dest}</marti></detail>`,
      );
    alpha.socket.write(directMessage("GeoChat.ALPHA.BETA.1", '<dest callsign="BETA"/>'));
    assert.ok(await beta.next((xml) => xml.includes("GeoChat.ALPHA.BETA.1")), "addressed callsign receives it");
    assert.equal(await gamma.next((xml) => xml.includes("GeoChat.ALPHA.BETA.1"), 300), null, "others in the event do not");

    alpha.socket.write(directMessage("GeoChat.ALPHA.GAMMA.1", '<dest uid="GAMMA"/>'));
    assert.ok(await gamma.next((xml) => xml.includes("GeoChat.ALPHA.GAMMA.1")), "addressed device UID receives it");
    assert.equal(await beta.next((xml) => xml.includes("GeoChat.ALPHA.GAMMA.1"), 300), null);

    alpha.socket.write(directMessage("GeoChat.ALPHA.MISSION.1", '<dest mission="Recon"/>'));
    assert.equal(await beta.next((xml) => xml.includes("GeoChat.ALPHA.MISSION.1"), 300), null, "unresolvable destinations reach nobody");

    const viewer = await createUser("Viewer", [{ permission: "tak-traffic.view", eventId: bravo.eventId }]);
    const live = (await request(app).get(`/api/v1/events/${bravo.eventId}/tak-traffic`).set("Cookie", viewer.cookie).expect(200)).body as {
      items: Array<{ uid: string }>;
    };
    assert.deepEqual(live.items.map(({ uid }) => uid).sort(), ["BETA", "BETA-MARKER", "GAMMA"]);
  });

  void it("shows an event's connections and positions in the live view, only with tak-traffic.view", async () => {
    const bravo = await activeEvent();
    const other = await activeEvent();
    const alpha = await open(await enrollTakClient(app, await member(bravo.eventId, bravo.groupId, bravo.roleId, "Alpha")));
    alpha.socket.write(positionEvent("ALPHA-LIVE"));
    await new Promise((resolve) => setTimeout(resolve, 200));

    const viewer = await createUser("Viewer", [{ permission: "tak-traffic.view", eventId: bravo.eventId }]);
    const live = (await request(app).get(`/api/v1/events/${bravo.eventId}/tak-traffic`).set("Cookie", viewer.cookie).expect(200)).body as {
      connections: Array<{ callsign: string | null; userDisplayName: string }>;
      items: Array<{ uid: string; lat: number; callsign: string | null }>;
    };
    assert.deepEqual(live.connections.map(({ callsign, userDisplayName }) => [callsign, userDisplayName]), [["ALPHA-LIVE", "Alpha"]]);
    assert.deepEqual(live.items.map(({ uid, lat }) => [uid, lat]), [["ALPHA-LIVE", 52.4]]);

    await request(app).get(`/api/v1/events/${other.eventId}/tak-traffic`).set("Cookie", viewer.cookie).expect(404);
    const reader = await createUser("Reader", [{ permission: "events.read", eventId: bravo.eventId }]);
    await request(app).get(`/api/v1/events/${bravo.eventId}/tak-traffic`).set("Cookie", reader.cookie).expect(403);
  });

  void it("records an event's traffic only when the event opted in, and deletes it after the retention", async () => {
    const bravo = await activeEvent();
    const alpha = await open(await enrollTakClient(app, await member(bravo.eventId, bravo.groupId, bravo.roleId, "Alpha")));
    alpha.socket.write(positionEvent("ALPHA-OFF"));
    await new Promise((resolve) => setTimeout(resolve, 300));
    assert.equal(await database.takTrafficItem.count(), 0, "nothing is stored by default");

    const manager = await createUser("Manager", [
      { permission: "events.manage", eventId: bravo.eventId },
      { permission: "tak-traffic.view", eventId: bravo.eventId },
    ]);
    const url = `/api/v1/events/${bravo.eventId}/tak-traffic/recording`;
    await request(app).put(url).set("Cookie", manager.cookie).send({ version: 0, enabled: true, retentionDays: 7 }).expect(200);
    alpha.socket.write(positionEvent("ALPHA-ON"));
    await new Promise((resolve) => setTimeout(resolve, 300));

    const exported = (await request(app).get(`${url}/export`).set("Cookie", manager.cookie).expect(200)).body as {
      features: Array<{ properties: { uid: string } }>;
    };
    assert.deepEqual(exported.features.map(({ properties }) => properties.uid), ["ALPHA-ON"]);
    assert.equal(await database.auditEvent.count({ where: { action: "tak-traffic.exported" } }), 1);

    await database.takTrafficItem.updateMany({ data: { receivedAt: new Date(Date.now() - 8 * 86_400_000) } });
    assert.equal(await purgeExpiredTraffic(), 1);
    const reader = await createUser("Reader", [{ permission: "tak-traffic.view", eventId: bravo.eventId }]);
    await request(app).put(url).set("Cookie", reader.cookie).send({ version: 1, enabled: false, retentionDays: 7 }).expect(403);
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

  void it("replays the current items of disconnected apps, but no deleted items, chats or the joiner's own items", async () => {
    const bravo = await activeEvent();
    const alphaClient = await enrollTakClient(app, await member(bravo.eventId, bravo.groupId, bravo.roleId, "Alpha"));
    const alpha = await open(alphaClient);
    alpha.socket.write(positionEvent("ALPHA-SA"));
    alpha.socket.write(markerEvent("MARKER-KEEP"));
    alpha.socket.write(markerEvent("MARKER-GONE"));
    alpha.socket.write(markerEvent("GeoChat.ALPHA.All.1", "b-t-f"));
    alpha.socket.write(markerEvent("DELETE-1", "t-x-d-d").replace("<detail>", '<detail><link uid="MARKER-GONE" relation="none" type="none"/>'));
    await new Promise((resolve) => setTimeout(resolve, 200));
    alpha.socket.destroy();
    await new Promise((resolve) => setTimeout(resolve, 200));

    const beta = await open(await enrollTakClient(app, await member(bravo.eventId, bravo.groupId, bravo.roleId, "Beta")));
    assert.ok(await beta.next((xml) => xml.includes('uid="MARKER-KEEP"')), "marker of a disconnected app");
    assert.ok(await beta.next((xml) => xml.includes('uid="ALPHA-SA"')), "last position of a disconnected app");
    assert.equal(beta.received.some((xml) => /uid="(MARKER-GONE|GeoChat\.ALPHA\.All\.1|DELETE-1)"/.test(xml)), false, "no deleted items, chats or deletions");

    const alphaAgain = await open(alphaClient);
    assert.equal(await alphaAgain.next((xml) => xml.includes('uid="MARKER-KEEP"'), 300), null, "own items are not sent back");
  });

  void it("switches a client to TAK Protocol version 1 and translates between Protobuf and XML clients", async () => {
    const bravo = await activeEvent();
    const xmlClient = await open(await enrollTakClient(app, await member(bravo.eventId, bravo.groupId, bravo.roleId, "Alpha")));
    const protobufClient = await openProtobuf(await enrollTakClient(app, await member(bravo.eventId, bravo.groupId, bravo.roleId, "Beta")));
    assert.ok(await xmlClient.next((xml) => xml.includes('type="t-x-takp-v"')), "XML clients are offered the protocol too");

    const payload = xmlToTakMessage(positionEvent("BETA-PB"));
    assert.ok(payload);
    protobufClient.socket.write(frameTakMessage(payload));
    const forwarded = await xmlClient.next((xml) => xml.includes('uid="BETA-PB"'));
    assert.ok(forwarded, "XML client receives the Protobuf client's position as XML");
    assert.match(forwarded, /<contact callsign="BETA-PB"\/>/);

    xmlClient.socket.write(markerEvent("ALPHA-MARKER"));
    const received = await protobufClient.next((xml) => xml.includes('uid="ALPHA-MARKER"'));
    assert.ok(received, "Protobuf client receives the XML client's marker as a framed payload");
    assert.equal(protobufClient.received.includes("invalid"), false);

    // A ping is answered in the negotiated encoding, and the negotiation itself is never forwarded.
    const ping = xmlToTakMessage(markerEvent("BETA-PING", "t-x-c-t"));
    assert.ok(ping);
    protobufClient.socket.write(frameTakMessage(ping));
    assert.ok(await protobufClient.next((xml) => xml.includes('type="t-x-c-t-r"')));
    assert.equal(xmlClient.received.some((xml) => xml.includes("t-x-takp-q")), false);
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
