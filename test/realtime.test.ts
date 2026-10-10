import assert from "node:assert/strict";
import { createServer, type Server as HttpServer } from "node:http";
import type { AddressInfo } from "node:net";
import { after, afterEach, beforeEach, describe, it } from "node:test";
import { io, type Socket } from "socket.io-client";
import request from "supertest";
import type { Server } from "socket.io";
import type { TakClientCertificate } from "../src/generated/prisma/client.js";
import { randomUUID } from "node:crypto";
import { createApp } from "../src/app.js";
import { attachSessionStream, SESSION_NAMESPACE, sessionNotices } from "../src/modules/auth/session.realtime.js";
import { attachEventMemberStream, EVENT_MEMBERS_NAMESPACE } from "../src/modules/event-members/event-members.realtime.js";
import { eventChanges } from "../src/modules/events/event-changes.js";
import { attachProfileUpdateStream, MY_EVENT_NAMESPACE } from "../src/modules/profiles/profile-updates.realtime.js";
import { takAcmeManager } from "../src/modules/tak-server/acme-manager.js";
import { attachTakServerStream, TAK_SERVER_NAMESPACE } from "../src/modules/tak-server/tak-server.realtime.js";
import { attachPackageChangeStream, DATA_PACKAGES_NAMESPACE, packageOfChange } from "../src/modules/data-packages/package-changes.realtime.js";
import { certificateEvents } from "../src/modules/tak-server/client-certificates.js";
import { attachTakTrafficStream, TAK_TRAFFIC_NAMESPACE } from "../src/modules/tak-server/live-traffic.realtime.js";
import { attachMyTakCertificateStream, MY_TAK_CERTIFICATES_NAMESPACE } from "../src/modules/tak-server/my-tak-certificates.realtime.js";
import { CotRouter, type CotPeer } from "../src/modules/tak-server/streaming/cot-router.js";
import { config } from "../src/shared/config/config.js";
import { database, disconnectDatabase } from "../src/shared/database/database.js";
import { createRealtimeServer, REALTIME_PATH } from "../src/shared/realtime/realtime-server.js";
import { clearDatabase, createEvent, createUser } from "./support/identity.js";

let httpServer: HttpServer;
let realtime: Server;
let router: CotRouter;
let port: number;
const sockets: Socket[] = [];

function connect(namespace: string, cookie: string, auth: Record<string, string> = {}): Socket {
  const socket = io(`http://127.0.0.1:${String(port)}${namespace}`, {
    path: REALTIME_PATH,
    transports: ["websocket"],
    reconnection: false,
    // Each socket needs its own connection, otherwise they share the first one's cookie.
    forceNew: true,
    auth,
    extraHeaders: { cookie, origin: new URL(config.publicOrigin).origin },
  });
  sockets.push(socket);
  return socket;
}

function outcome(socket: Socket): Promise<string> {
  return new Promise((resolve) => {
    socket.on("connect", () => resolve("connected"));
    socket.on("connect_error", (error) => resolve(error.message));
  });
}

function peerIn(eventId: string): CotPeer {
  return {
    id: "peer-1",
    scope: new Map([[eventId, { groupId: null, seesAll: true, receives: null, sends: null }]]),
    send: () => undefined,
    userId: "00000000-0000-0000-0000-000000000000",
    certificateId: "certificate-1",
    callsign: "ALPHA",
    deviceUid: null,
    connectedAt: new Date(),
    lastSeenAt: new Date(),
  };
}

void describe("realtime streams", () => {
  beforeEach(async () => {
    await clearDatabase();
    router = new CotRouter();
    httpServer = createServer(createApp());
    realtime = createRealtimeServer(httpServer);
    attachTakTrafficStream(realtime, router);
    attachMyTakCertificateStream(realtime);
    attachPackageChangeStream(realtime);
    attachEventMemberStream(realtime);
    attachProfileUpdateStream(realtime);
    attachSessionStream(realtime);
    attachTakServerStream(realtime);
    await new Promise<void>((resolve) => httpServer.listen(0, "127.0.0.1", resolve));
    port = (httpServer.address() as AddressInfo).port;
  });

  afterEach(async () => {
    for (const socket of sockets.splice(0)) {
      socket.disconnect();
    }
    await realtime.close();
  });

  after(async () => {
    await clearDatabase();
    await disconnectDatabase();
  });

  void it("pushes an event's live TAK traffic only to viewers of that event", async () => {
    const eventId = await createEvent();
    const otherEventId = await createEvent();
    const viewer = await createUser("Viewer", [{ permission: "tak-traffic.view", eventId }]);

    const socket = connect(TAK_TRAFFIC_NAMESPACE, viewer.cookie, { eventId });
    const snapshots: Array<{ connections: unknown[]; items: Array<{ uid: string }> }> = [];
    socket.on("traffic", (traffic: (typeof snapshots)[number]) => snapshots.push(traffic));
    assert.equal(await outcome(socket), "connected");

    const peer = peerIn(eventId);
    router.join(peer);
    const now = Date.now();
    router.remember(peer, { uid: "ALPHA-1", type: "a-f-G", callsign: "ALPHA", lat: 52.4, lon: 13.1, course: null, speed: null, time: new Date(now), stale: new Date(now + 60_000) }, "<event/>");
    await new Promise((resolve) => setTimeout(resolve, 800));
    assert.deepEqual(snapshots.at(-1)?.items.map(({ uid }) => uid), ["ALPHA-1"]);

    assert.equal(await outcome(connect(TAK_TRAFFIC_NAMESPACE, viewer.cookie, { eventId: otherEventId })), "Access denied");
    const reader = await createUser("Reader", [{ permission: "events.read", eventId }]);
    assert.equal(await outcome(connect(TAK_TRAFFIC_NAMESPACE, reader.cookie, { eventId })), "Access denied");
    assert.equal(await outcome(connect(TAK_TRAFFIC_NAMESPACE, viewer.cookie)), "Access denied");
  });

  void it("tells only the owner when their TAK app received a certificate", async () => {
    const owner = await createUser("Owner", []);
    const someoneElse = await createUser("Someone", []);
    const own = connect(MY_TAK_CERTIFICATES_NAMESPACE, owner.cookie);
    const foreign = connect(MY_TAK_CERTIFICATES_NAMESPACE, someoneElse.cookie);
    assert.deepEqual(await Promise.all([outcome(own), outcome(foreign)]), ["connected", "connected"]);

    let foreignHeard = false;
    foreign.on("issued", () => {
      foreignHeard = true;
    });
    const heard = new Promise<{ certificateId: string; clientUid: string | null }>((resolve) => own.once("issued", resolve));
    certificateEvents.emit("issued", { id: "certificate-1", userId: owner.id, clientUid: "ANDROID-1" } as TakClientCertificate);
    assert.deepEqual(await heard, { certificateId: "certificate-1", clientUid: "ANDROID-1" });
    await new Promise((resolve) => setTimeout(resolve, 100));
    assert.equal(foreignHeard, false);

    assert.equal(await outcome(connect(MY_TAK_CERTIFICATES_NAMESPACE, "")), "Access denied");
  });

  void it("tells the event's map editors which data package changed and which tab changed it", async () => {
    const eventId = await createEvent();
    const editor = await createUser("Editor", [
      { permission: "data-packages.read", eventId },
      { permission: "data-packages.edit", eventId },
    ]);
    const watcher = connect(DATA_PACKAGES_NAMESPACE, editor.cookie, { eventId });
    assert.equal(await outcome(watcher), "connected");

    type Notice = { packageId: string | null; path: string; method: string; createdId: string | null; tabId: string | null };
    const listChanged = new Promise<Notice>((resolve) => watcher.once("changed", resolve));
    const created = (
      await request(httpServer).post(`/api/v1/events/${eventId}/data-packages`).set("Cookie", editor.cookie).set("X-OpenMeshTak-Tab", "tab-a").send({ name: "Recon" }).expect(201)
    ).body as { id: string };
    assert.deepEqual(await listChanged, { eventId, packageId: null, path: "", method: "POST", createdId: created.id, tabId: "tab-a" });

    const layerAdded = new Promise<Notice>((resolve) => watcher.once("changed", resolve));
    const layer = (
      await request(httpServer).post(`/api/v1/events/${eventId}/data-packages/${created.id}/layers`).set("Cookie", editor.cookie).send({ name: "Routes" }).expect(201)
    ).body as { id: string };
    assert.deepEqual(await layerAdded, { eventId, packageId: created.id, path: "layers", method: "POST", createdId: layer.id, tabId: null });

    const packageDeleted = new Promise<Notice>((resolve) => watcher.once("changed", resolve));
    await request(httpServer).delete(`/api/v1/events/${eventId}/data-packages/${created.id}`).set("Cookie", editor.cookie).expect(204);
    assert.deepEqual(await packageDeleted, { eventId, packageId: null, path: "", method: "DELETE", createdId: null, tabId: null }, "a deleted package changes the list");

    let heardFailure = false;
    watcher.once("changed", () => {
      heardFailure = true;
    });
    await request(httpServer).post(`/api/v1/events/${eventId}/data-packages`).set("Cookie", editor.cookie).send({}).expect(422);
    await new Promise((resolve) => setTimeout(resolve, 100));
    assert.equal(heardFailure, false, "failed requests change nothing and announce nothing");

    const outsider = await createUser("Outsider", []);
    assert.equal(await outcome(connect(DATA_PACKAGES_NAMESPACE, outsider.cookie, { eventId })), "Access denied");
  });

  void it("maps changed routes to the data package they touched", () => {
    const packageId = randomUUID();
    assert.equal(packageOfChange(`data-packages/${packageId}/objects/${randomUUID()}`), packageId);
    assert.equal(packageOfChange("data-packages"), null);
    assert.equal(packageOfChange("data-package-order"), null);
    assert.equal(packageOfChange("data-package-imports/atak"), null);
    assert.equal(packageOfChange("data-package-exports/atak"), undefined);
    assert.equal(packageOfChange("members"), undefined);
  });

  void it("refreshes member views and member dashboards only for changes that concern them", async () => {
    const eventId = await createEvent();
    const roleId = randomUUID();
    const groupId = randomUUID();
    await database.eventRole.create({ data: { id: roleId, eventId, name: "Participant", slug: "participant" } });
    await database.eventGroup.create({ data: { id: groupId, eventId, name: "Bravo", slug: "bravo", shortNamePrefix: "B" } });
    const participant = await createUser("Peter", []);
    await database.eventMember.create({
      data: { id: randomUUID(), eventId, userId: participant.id, eventRoleId: roleId, eventGroupId: groupId, username: "Peter", callsign: "Peter", shortNameNumber: 1 },
    });
    const organizer = await createUser("Organizer", [{ permission: "members.read", eventId }]);

    const members = connect(EVENT_MEMBERS_NAMESPACE, organizer.cookie, { eventId });
    const dashboard = connect(MY_EVENT_NAMESPACE, participant.cookie, { eventId });
    assert.deepEqual(await Promise.all([outcome(members), outcome(dashboard)]), ["connected", "connected"]);

    const heard: string[] = [];
    members.on("changed", () => heard.push("members"));
    dashboard.on("updated", () => heard.push("dashboard"));
    eventChanges.emit("changed", { eventId, path: `data-packages/${randomUUID()}/objects`, method: "PUT", createdId: null, tabId: null });
    eventChanges.emit("changed", { eventId, path: "configuration-revisions", method: "PUT", createdId: null, tabId: null });
    eventChanges.emit("changed", { eventId, path: "sync-issues/abc/resolve", method: "POST", createdId: null, tabId: null });
    await new Promise((resolve) => setTimeout(resolve, 150));
    assert.deepEqual(heard.sort(), ["dashboard", "members"]);

    assert.equal(await outcome(connect(MY_EVENT_NAMESPACE, organizer.cookie, { eventId })), "Access denied", "only members see the dashboard stream");
    assert.equal(await outcome(connect(EVENT_MEMBERS_NAMESPACE, participant.cookie, { eventId })), "Access denied");
  });

  void it("shows who else edits the event and what they selected", async () => {
    const eventId = await createEvent();
    const alice = await createUser("Alice", [{ permission: "data-packages.read", eventId }]);
    const bob = await createUser("Bob", [{ permission: "data-packages.read", eventId }]);
    const aliceTab = connect(DATA_PACKAGES_NAMESPACE, alice.cookie, { eventId });
    assert.equal(await outcome(aliceTab), "connected");
    type Presence = Array<{ userId: string; name: string; color: string; packageId: string | null; objectId: string | null }>;
    const latest: { value: Presence } = { value: [] };
    aliceTab.on("presence", (list: Presence) => {
      latest.value = list;
    });

    const bobTab = connect(DATA_PACKAGES_NAMESPACE, bob.cookie, { eventId });
    assert.equal(await outcome(bobTab), "connected");
    const packageId = randomUUID();
    const objectId = randomUUID();
    bobTab.emit("presence", { packageId, objectId: "not-an-id" });
    bobTab.emit("presence", { packageId, objectId });
    await new Promise((resolve) => setTimeout(resolve, 300));
    const bobEntry = latest.value.find(({ userId }) => userId === bob.id);
    assert.deepEqual([bobEntry?.name, bobEntry?.packageId, bobEntry?.objectId], ["Bob", packageId, objectId]);
    assert.match(bobEntry?.color ?? "", /^#[0-9a-f]{6}$/);

    bobTab.disconnect();
    await new Promise((resolve) => setTimeout(resolve, 200));
    assert.deepEqual(latest.value.map(({ name }) => name), ["Alice"]);
  });

  void it("asks a user's tabs to check their session when it was ended", async () => {
    const user = await createUser("Peter", []);
    const tab = connect(SESSION_NAMESPACE, user.cookie);
    assert.equal(await outcome(tab), "connected");
    const asked = new Promise<void>((resolve) => tab.once("check-session", () => resolve()));
    sessionNotices.emit("ended", user.id);
    await asked;
    assert.equal(await outcome(connect(SESSION_NAMESPACE, "")), "Access denied");
  });

  void it("keeps the TAK server page of administrators current", async () => {
    const admin = await createUser("Admin", [{ permission: "tak-server.manage" }]);
    const page = connect(TAK_SERVER_NAMESPACE, admin.cookie);
    assert.equal(await outcome(page), "connected");
    const certificates = new Promise<void>((resolve) => page.once("certificates", () => resolve()));
    const acme = new Promise<void>((resolve) => page.once("acme", () => resolve()));
    certificateEvents.emit("revoked", { id: "certificate-1", userId: admin.id, clientUid: null } as TakClientCertificate);
    takAcmeManager.emit("changed");
    await Promise.all([certificates, acme]);

    const user = await createUser("Peter", []);
    assert.equal(await outcome(connect(TAK_SERVER_NAMESPACE, user.cookie)), "Access denied");
  });

  void it("refuses handshakes from another site and the unused main namespace", async () => {
    const owner = await createUser("Owner", []);
    const foreign = io(`http://127.0.0.1:${String(port)}${MY_TAK_CERTIFICATES_NAMESPACE}`, {
      path: REALTIME_PATH,
      transports: ["websocket"],
      reconnection: false,
    // Each socket needs its own connection, otherwise they share the first one's cookie.
    forceNew: true,
      extraHeaders: { cookie: owner.cookie, origin: "https://attacker.example" },
    });
    sockets.push(foreign);
    assert.notEqual(await outcome(foreign), "connected");
    assert.notEqual(await outcome(connect("/", owner.cookie)), "connected");
  });
});
