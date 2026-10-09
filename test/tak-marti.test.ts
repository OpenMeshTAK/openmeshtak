import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { createServer, request as httpsRequest, type Server } from "node:https";
import type { AddressInfo } from "node:net";
import { after, afterEach, beforeEach, describe, it } from "node:test";
import type { Express } from "express";
import request from "supertest";
import { unzipSync } from "fflate";
import { createApp } from "../src/app.js";
import { trustedCertificateAuthorities } from "../src/modules/tak-server/certificate-authority.js";
import { createMartiApp } from "../src/modules/tak-server/marti/marti-app.js";
import { cotRouter, type CotPeer } from "../src/modules/tak-server/streaming/cot-router.js";
import { currentServerCertificate, decryptServerKey } from "../src/modules/tak-server/server-certificate.js";
import { PERMISSIONS } from "../src/shared/auth/permissions.js";
import { database, disconnectDatabase } from "../src/shared/database/database.js";
import { clearDatabase, createEvent, createUser, type TestUser } from "./support/identity.js";
import { enableTakServer, enrollTakClient, type EnrolledClient } from "./support/tak.js";

const none = { groupIds: [], roleIds: [], memberIds: [] };

let app: Express;
let admin: TestUser;
let server: Server;
let port: number;
let eventId: string;
let bravoId: string;
let charlieId: string;
let roleId: string;

interface Response {
  status: number;
  body: Buffer;
}

function get(client: EnrolledClient | null, path: string, caPems: string[], method = "GET", json?: unknown): Promise<Response> {
  return new Promise((resolve, reject) => {
    const outgoing = httpsRequest(
      {
        host: "127.0.0.1",
        port,
        path,
        method,
        headers: json === undefined ? {} : { "content-type": "application/json" },
        servername: "tak.example.org",
        ca: caPems,
        ...(client === null ? {} : { cert: client.certificatePem, key: client.privateKeyPem }),
      },
      (incoming) => {
        const chunks: Buffer[] = [];
        incoming.on("data", (chunk: Buffer) => chunks.push(chunk));
        incoming.on("end", () => resolve({ status: incoming.statusCode ?? 0, body: Buffer.concat(chunks) }));
      },
    );
    outgoing.on("error", reject);
    outgoing.end(json === undefined ? undefined : JSON.stringify(json));
  });
}

async function publishPackage(name: string, groupIds: string[] | null, takDelivery?: { onEnrollment: boolean; onConnection: boolean }): Promise<void> {
  const url = `/api/v1/events/${eventId}/data-packages`;
  const created = (await request(app).post(url).set("Cookie", admin.cookie).send({ name }).expect(201)).body as { id: string; version: number };
  if (groupIds !== null) {
    await request(app)
      .put(`${url}/${created.id}/audience`)
      .set("Cookie", admin.cookie)
      .send({ version: created.version, audience: { allMembers: false, ...none, groupIds } })
      .expect(200);
  }
  if (takDelivery !== undefined) {
    const current = (await request(app).get(`${url}/${created.id}`).set("Cookie", admin.cookie).expect(200)).body as { version: number };
    await request(app)
      .put(`${url}/${created.id}/tak-delivery`)
      .set("Cookie", admin.cookie)
      .send({ version: current.version, takDelivery })
      .expect(200);
  }
  await request(app).post(`${url}/${created.id}/revisions`).set("Cookie", admin.cookie).expect(200);
}

function zipEntries(body: Buffer): string[] {
  return Object.keys(unzipSync(new Uint8Array(body)));
}

async function memberOf(groupId: string, name: string): Promise<TestUser> {
  const user = await createUser(name, []);
  await database.eventMember.create({
    data: { id: randomUUID(), eventId, userId: user.id, eventRoleId: roleId, eventGroupId: groupId, username: name, callsign: name, shortNameNumber: name.length },
  });
  return user;
}

async function names(client: EnrolledClient): Promise<Array<{ Name: string; Hash: string }>> {
  const response = await get(client, "/Marti/sync/search?keywords=missionpackage", client.caPems);
  assert.equal(response.status, 200);
  return (JSON.parse(response.body.toString("utf8")) as { results: Array<{ Name: string; Hash: string }> }).results;
}

void describe("TAK Marti Data Package API", () => {
  beforeEach(async () => {
    await clearDatabase();
    app = createApp();
    admin = await createUser("Admin", PERMISSIONS.map((permission) => ({ permission })));
    eventId = await createEvent();
    await database.event.update({ where: { id: eventId }, data: { status: "active" } });
    roleId = randomUUID();
    bravoId = randomUUID();
    charlieId = randomUUID();
    await database.eventRole.create({ data: { id: roleId, eventId, name: "Participant", slug: "participant" } });
    await database.eventGroup.createMany({
      data: [
        { id: bravoId, eventId, name: "Bravo", slug: "bravo", shortNamePrefix: "B" },
        { id: charlieId, eventId, name: "Charlie", slug: "charlie", shortNamePrefix: "C" },
      ],
    });
    await enableTakServer(app, admin);
    const certificate = await currentServerCertificate("tak.example.org");
    const ca = (await trustedCertificateAuthorities()).map(({ certificatePem }) => certificatePem);
    server = createServer(
      { cert: certificate.certificateChainPem, key: decryptServerKey(certificate), ca, requestCert: true, rejectUnauthorized: true },
      createMartiApp(),
    );
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    port = (server.address() as AddressInfo).port;
  });

  afterEach(async () => {
    server.closeAllConnections();
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  after(async () => {
    await clearDatabase();
    await disconnectDatabase();
  });

  void it("lists exactly the packages of the member's audience and every package for administrators", async () => {
    await publishPackage("Everyone", null);
    await publishPackage("Bravo only", [bravoId]);
    const bravo = await enrollTakClient(app, await memberOf(bravoId, "Peter"));
    const charlie = await enrollTakClient(app, await memberOf(charlieId, "Anna"));
    const operator = await enrollTakClient(app, await createUser("Operator", [{ permission: "tak-server.admin-access" }]));

    // Names without ".zip": ATAK appends the extension itself when it saves a download.
    assert.deepEqual((await names(bravo)).map(({ Name }) => Name).sort(), ["Bravo_only-r1", "Everyone-r1"]);
    assert.deepEqual((await names(charlie)).map(({ Name }) => Name), ["Everyone-r1"]);
    assert.equal((await names(operator)).length, 2);
  });

  void it("lists results ATAK can parse", async () => {
    await publishPackage("Everyone", null);
    const client = await enrollTakClient(app, await memberOf(bravoId, "Peter"));
    const response = await get(client, "/Marti/sync/search?keywords=missionpackage&tool=public", client.caPems);
    const [result] = (JSON.parse(response.body.toString("utf8")) as { results: Array<{ PrimaryKey: unknown }> }).results;

    // ATAK reads PrimaryKey as a non-negative int and drops the whole list otherwise.
    assert.ok(Number.isInteger(result?.PrimaryKey) && (result?.PrimaryKey as number) >= 0 && (result?.PrimaryKey as number) <= 2 ** 31 - 1);
  });

  void it("downloads a package by hash only when it is visible and audits it", async () => {
    await publishPackage("Bravo only", [bravoId]);
    const bravo = await enrollTakClient(app, await memberOf(bravoId, "Peter"));
    const charlie = await enrollTakClient(app, await memberOf(charlieId, "Anna"));
    const [listed] = await names(bravo);
    assert.ok(listed);

    const download = await get(bravo, `/Marti/sync/content?hash=${listed.Hash}`, bravo.caPems);
    assert.equal(download.status, 200);
    assert.equal(download.body.subarray(0, 2).toString("latin1"), "PK");
    assert.equal((await get(charlie, `/Marti/sync/content?hash=${listed.Hash}`, charlie.caPems)).status, 404);

    const audit = await database.auditEvent.findFirstOrThrow({ where: { action: "data-package.downloaded" } });
    assert.equal((audit.metadata as { via: string }).via, "tak-server");
  });

  void it("delivers packages chosen for connections, only when they changed since the last sync", async () => {
    await publishPackage("Live map", null, { onEnrollment: false, onConnection: true });
    await publishPackage("Manual only", null);
    const bravo = await enrollTakClient(app, await memberOf(bravoId, "Peter"));

    const profile = await get(bravo, "/Marti/api/device/profile/connection?syncSecago=-1&clientUid=TEST", bravo.caPems);
    assert.equal(profile.status, 200);
    const entries = zipEntries(profile.body);
    assert.ok(entries.some((entry) => entry.endsWith("Live_map-r1.zip")));
    assert.ok(!entries.some((entry) => entry.includes("Manual_only")));
    assert.ok(entries.includes("MANIFEST/manifest.xml"));

    await database.packageRevision.updateMany({ data: { createdAt: new Date(Date.now() - 3_600_000) } });
    const unchanged = await get(bravo, "/Marti/api/device/profile/connection?syncSecago=60", bravo.caPems);
    assert.equal(unchanged.status, 204, "nothing new since the last sync a minute ago");
  });

  void it("delivers the event's published ATAK preferences in the device profile, again only after a change", async () => {
    const configurationUrl = `/api/v1/events/${eventId}/tak/configuration`;
    const revisionsUrl = `/api/v1/events/${eventId}/configuration-revisions`;
    await request(app).post(revisionsUrl).set("Cookie", admin.cookie).send({}).expect(200);
    const uploaded = await request(app)
      .put(`${configurationUrl}/atak-preferences`)
      .set("Cookie", admin.cookie)
      .send({
        version: 0,
        file: {
          fileName: "atak.pref",
          content:
            '<preferences><preference version="1" name="com.atakmap.app_preferences">' +
            '<entry key="alt_display_agl" class="class java.lang.Boolean">true</entry>' +
            '<entry key="locationCallsign" class="class java.lang.String">ADMIN</entry></preference></preferences>',
        },
      })
      .expect(200);
    const upload = uploaded.body as { removedKeys: string[]; configuration: { version: number } };
    assert.deepEqual(upload.removedKeys, ["locationCallsign"]);
    await request(app)
      .put(configurationUrl)
      .set("Cookie", admin.cookie)
      .send({
        version: upload.configuration.version,
        meshChannelId: null,
        atakSettings: { coordinateFormat: "MGRS", altitudeReference: null, altitudeUnit: "meters", speedUnit: null, distanceUnit: null, northReference: null },
      })
      .expect(200);
    const pending = (await request(app).get(`${revisionsUrl}/pending-changes`).set("Cookie", admin.cookie).expect(200)).body as unknown;
    assert.ok(JSON.stringify(pending).includes("ATAK settings"), "pending changes name the ATAK settings");
    await request(app).post(revisionsUrl).set("Cookie", admin.cookie).send({}).expect(200);

    const bravo = await enrollTakClient(app, await memberOf(bravoId, "Peter"));
    // The enrollment profile on the enrollment port is built by the same code.
    const connection = await get(bravo, "/Marti/api/device/profile/connection?syncSecago=-1&clientUid=TEST", bravo.caPems);
    assert.equal(connection.status, 200, "first connection applies the preferences");
    const preferences = new TextDecoder().decode(unzipSync(new Uint8Array(connection.body))["preferences/preference.pref"]);
    assert.match(preferences, /<entry key="alt_display_agl" class="class java.lang.Boolean">true<\/entry>/);
    assert.match(preferences, /<entry key="coord_display_pref" class="class java.lang.String">MGRS<\/entry>/);
    assert.match(preferences, /<entry key="alt_unit_pref" class="class java.lang.String">1<\/entry>/);
    assert.doesNotMatch(preferences, /locationCallsign/);

    await database.eventConfigurationRevision.updateMany({ data: { createdAt: new Date(Date.now() - 3_600_000) } });
    const unchanged = await get(bravo, "/Marti/api/device/profile/connection?syncSecago=60", bravo.caPems);
    assert.equal(unchanged.status, 204, "unchanged preferences are not sent again");
  });

  void it("answers CoT history queries only from events that record their traffic", async () => {
    const bravo = await enrollTakClient(app, await memberOf(bravoId, "Peter"));
    const otherEventId = await createEvent();
    await database.event.update({ where: { id: otherEventId }, data: { status: "active" } });
    const position = (eventId: string, minutesAgo: number, lat: number) => ({
      id: randomUUID(),
      eventId,
      uid: "ANDROID-ALPHA",
      type: "a-f-G-U-C",
      callsign: "ALPHA & CO",
      lat,
      lon: 11.6,
      time: new Date(Date.now() - minutesAgo * 60_000),
      stale: new Date(Date.now() - minutesAgo * 60_000 + 120_000),
      userId: admin.id,
    });
    await database.takTrafficItem.createMany({
      data: [position(eventId, 30, 52.1), position(eventId, 5, 52.2), position(otherEventId, 1, 40.0)],
    });

    assert.equal((await get(bravo, "/Marti/api/cot/xml/ANDROID-ALPHA", bravo.caPems)).status, 404, "nothing while the event does not record");

    await database.takTrafficRecording.create({ data: { eventId, enabled: true, retentionDays: 7 } });
    await database.takTrafficRecording.create({ data: { eventId: otherEventId, enabled: true, retentionDays: 7 } });
    const latest = await get(bravo, "/Marti/api/cot/xml/ANDROID-ALPHA", bravo.caPems);
    assert.equal(latest.status, 200);
    assert.match(latest.body.toString("utf8"), /<point lat="52.2"/);
    assert.match(latest.body.toString("utf8"), /callsign="ALPHA &#38; CO"/);

    const recent = (await get(bravo, "/Marti/api/cot/xml/ANDROID-ALPHA/all?secago=600", bravo.caPems)).body.toString("utf8");
    assert.equal(recent.match(/<event /g)?.length, 1, "secago limits the window");
    const all = (await get(bravo, "/Marti/api/cot/xml/ANDROID-ALPHA/all", bravo.caPems)).body.toString("utf8");
    assert.equal(all.match(/<event /g)?.length, 2, "never items of an event the member is not in");
    assert.equal((await get(bravo, "/Marti/api/cot/xml/ANDROID-ALPHA/all?start=yesterday", bravo.caPems)).status, 400);
    assert.equal(await database.auditEvent.count({ where: { action: "tak-traffic.history-queried" } }), 3);
  });

  void it("lists the apps of the caller's events as server contacts, also after they disconnected", async () => {
    const bravo = await enrollTakClient(app, await memberOf(bravoId, "Peter"));
    const peer = (id: string, scope: string, deviceUid: string, callsign: string): CotPeer => ({
      id,
      scope: new Map([[scope, { groupId: null, seesAll: true, receives: null, sends: null }]]),
      send: () => undefined,
      userId: admin.id,
      certificateId: id,
      callsign,
      deviceUid,
      connectedAt: new Date(),
      lastSeenAt: new Date(),
    });
    const alpha = peer(randomUUID(), eventId, "ANDROID-ALPHA", "ALPHA");
    const charlie = peer(randomUUID(), eventId, "ANDROID-CHARLIE", "CHARLIE");
    const stranger = peer(randomUUID(), randomUUID(), "ANDROID-STRANGER", "STRANGER");
    for (const each of [alpha, charlie, stranger]) {
      cotRouter.join(each);
      cotRouter.identify(each);
    }
    cotRouter.leave(charlie.id);

    const response = await get(bravo, "/Marti/api/clientEndPoints", bravo.caPems);
    const body = JSON.parse(response.body.toString("utf8")) as {
      type: string;
      data: Array<{ uid: string; callsign: string; lastEventTime: string; lastStatus: string }>;
    };
    cotRouter.leave(alpha.id);
    cotRouter.leave(stranger.id);
    assert.equal(body.type, "com.bbn.marti.remote.ClientEndpoint");
    assert.deepEqual(
      body.data.map(({ uid, lastStatus }) => [uid, lastStatus]).sort(),
      [
        ["ANDROID-ALPHA", "Connected"],
        ["ANDROID-CHARLIE", "Disconnected"],
      ],
    );
    assert.match(body.data[0]?.lastEventTime ?? "", /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/);
  });

  void it("lists the member's TAK groups for the app only when the event shows them, and lets the app switch them off", async () => {
    const user = await memberOf(bravoId, "Peter");
    const bravo = await enrollTakClient(app, user);
    const memberId = (await database.eventMember.findFirstOrThrow({ where: { userId: user.id } })).id;
    const groupsUrl = `/api/v1/events/${eventId}/tak/groups`;
    const medics = (await request(app)
      .post(groupsUrl)
      .set("Cookie", admin.cookie)
      .send({ name: "Medics", members: [{ memberId, receive: true, send: true }] })
      .expect(201)).body as { id: string; receiverCount: number; members: unknown[] };
    assert.equal(medics.receiverCount, 1);
    await request(app).post(groupsUrl).set("Cookie", admin.cookie).send({ name: "Medics" }).expect(409);
    await request(app).post(groupsUrl).set("Cookie", admin.cookie).send({ name: "HQ", members: [{ memberId: randomUUID(), receive: true, send: false }] }).expect(422);

    const list = async (): Promise<Array<{ name: string; direction: string; active: boolean; created: string; bitpos: number }>> => {
      const response = await get(bravo, "/Marti/api/groups/all?useCache=true&clientUid=ANDROID-PETER", bravo.caPems);
      const body = JSON.parse(response.body.toString("utf8")) as { type: string; data: Array<{ name: string; direction: string; active: boolean; created: string; bitpos: number }> };
      assert.equal(body.type, "com.bbn.marti.remote.groups.Group");
      return body.data;
    };
    await database.takConfiguration.create({ data: { eventId, groupMode: "advanced", groupsInApp: false } });
    assert.deepEqual(await list(), [], "hidden while the event does not show groups in the app");

    await database.takConfiguration.update({ where: { eventId }, data: { groupsInApp: true } });
    const shown = await list();
    assert.deepEqual(shown.map(({ name, direction, active }) => [name, direction, active]), [["Medics", "IN", true], ["Medics", "OUT", true]]);
    assert.match(shown[0]?.created ?? "", /^\d{4}-\d\d-\d\d$/);

    const switched = shown.map((entry) => ({ ...entry, active: entry.direction === "OUT" }));
    assert.equal((await get(bravo, "/Marti/api/groups/active?clientUid=ANDROID-PETER", bravo.caPems, "PUT", switched)).status, 200);
    assert.deepEqual((await list()).map(({ direction, active }) => [direction, active]), [["IN", false], ["OUT", true]]);
  });

  void it("refuses clients without a certificate and revoked certificates", async () => {
    const bravo = await enrollTakClient(app, await memberOf(bravoId, "Peter"));
    await assert.rejects(get(null, "/Marti/api/version/config", bravo.caPems));

    await database.takClientCertificate.updateMany({ where: {}, data: { revokedAt: new Date() } });
    assert.equal((await get(bravo, "/Marti/api/version/config", bravo.caPems)).status, 401);
  });
});
