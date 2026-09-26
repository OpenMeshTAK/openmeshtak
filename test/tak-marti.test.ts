import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { createServer, request as httpsRequest, type Server } from "node:https";
import type { AddressInfo } from "node:net";
import { after, afterEach, beforeEach, describe, it } from "node:test";
import type { Express } from "express";
import request from "supertest";
import { createApp } from "../src/app.js";
import { trustedCertificateAuthorities } from "../src/modules/tak-server/certificate-authority.js";
import { createMartiApp } from "../src/modules/tak-server/marti/marti-app.js";
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

function get(client: EnrolledClient | null, path: string, caPems: string[]): Promise<Response> {
  return new Promise((resolve, reject) => {
    const outgoing = httpsRequest(
      {
        host: "127.0.0.1",
        port,
        path,
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
    outgoing.end();
  });
}

async function publishPackage(name: string, groupIds: string[] | null): Promise<void> {
  const url = `/api/v1/events/${eventId}/data-packages`;
  const created = (await request(app).post(url).set("Cookie", admin.cookie).send({ name }).expect(201)).body as { id: string; version: number };
  if (groupIds !== null) {
    await request(app)
      .put(`${url}/${created.id}/audience`)
      .set("Cookie", admin.cookie)
      .send({ version: created.version, audience: { allMembers: false, ...none, groupIds } })
      .expect(200);
  }
  await request(app).post(`${url}/${created.id}/revisions`).set("Cookie", admin.cookie).expect(200);
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

    assert.deepEqual((await names(bravo)).map(({ Name }) => Name).sort(), ["Bravo_only-r1.zip", "Everyone-r1.zip"]);
    assert.deepEqual((await names(charlie)).map(({ Name }) => Name), ["Everyone-r1.zip"]);
    assert.equal((await names(operator)).length, 2);
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

  void it("refuses clients without a certificate and revoked certificates", async () => {
    const bravo = await enrollTakClient(app, await memberOf(bravoId, "Peter"));
    await assert.rejects(get(null, "/Marti/api/version/config", bravo.caPems));

    await database.takClientCertificate.updateMany({ where: {}, data: { revokedAt: new Date() } });
    assert.equal((await get(bravo, "/Marti/api/version/config", bravo.caPems)).status, 401);
  });
});
