import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { EventEmitter } from "node:events";
import type { Socket } from "node:net";
import { after, beforeEach, describe, it } from "node:test";
import type { Express } from "express";
import request from "supertest";
import { createApp } from "../src/app.js";
import { authenticateTakClient } from "../src/modules/tak-server/client-authentication.js";
import { takConnections } from "../src/modules/tak-server/tak-connections.js";
import { database, disconnectDatabase } from "../src/shared/database/database.js";
import { clearDatabase, createEvent, createUser, type TestUser } from "./support/identity.js";
import { enableTakServer, enrollTakClient } from "./support/tak.js";

let app: Express;
let admin: TestUser;
let member: TestUser;
let eventId: string;

/** Stands in for a TLS socket; the registry only listens for close and calls destroy. */
function fakeSocket(): Socket & { destroyed: boolean } {
  const socket = new EventEmitter() as unknown as Socket & { destroyed: boolean };
  socket.destroyed = false;
  socket.destroy = () => {
    socket.destroyed = true;
    socket.emit("close");
    return socket;
  };
  return socket;
}

void describe("TAK client certificates", () => {
  beforeEach(async () => {
    await clearDatabase();
    app = createApp();
    admin = await createUser("Admin", [{ permission: "tak-server.manage" }]);
    member = await createUser("Peter", []);
    eventId = await createEvent();
    await database.event.update({ where: { id: eventId }, data: { status: "active" } });
    const roleId = randomUUID();
    const groupId = randomUUID();
    await database.eventRole.create({ data: { id: roleId, eventId, name: "Participant", slug: "participant" } });
    await database.eventGroup.create({ data: { id: groupId, eventId, name: "Bravo", slug: "bravo", shortNamePrefix: "B" } });
    await database.eventMember.create({
      data: { id: randomUUID(), eventId, userId: member.id, eventRoleId: roleId, eventGroupId: groupId, username: "Peter", callsign: "Peter", shortNameNumber: 1 },
    });
    await enableTakServer(app, admin);
  });

  after(async () => {
    await clearDatabase();
    await disconnectDatabase();
  });

  void it("authenticates an issued certificate only while its user has TAK access", async () => {
    const client = await enrollTakClient(app, member);
    const authenticated = await authenticateTakClient(client.certificateDer);
    assert.equal(authenticated?.userId, member.id);
    assert.deepEqual(authenticated?.access, { admin: false, eventIds: [eventId] });

    await database.event.update({ where: { id: eventId }, data: { status: "archived" } });
    assert.equal(await authenticateTakClient(client.certificateDer), null, "archived event, no access");
    assert.equal(await authenticateTakClient(Buffer.from("not a certificate")), null);
  });

  void it("lets members revoke their own certificates and administrators any", async () => {
    const first = await enrollTakClient(app, member);
    const second = await enrollTakClient(app, member);
    const mine = (await request(app).get("/api/v1/me/tak-certificates").set("Cookie", member.cookie).expect(200)).body as Array<{
      id: string;
      fingerprintSha256: string;
    }>;
    assert.equal(mine.length, 2);
    const [secondRow, firstRow] = mine;

    const outsider = await createUser("Outsider", []);
    await request(app).post(`/api/v1/me/tak-certificates/${firstRow?.id ?? ""}/revoke`).set("Cookie", outsider.cookie).send({}).expect(404);
    const revoked = await request(app)
      .post(`/api/v1/me/tak-certificates/${firstRow?.id ?? ""}/revoke`)
      .set("Cookie", member.cookie)
      .send({ reason: "Phone lost" })
      .expect(200);
    assert.equal((revoked.body as { status: string }).status, "revoked");
    assert.equal(await authenticateTakClient(first.certificateDer), null);

    await request(app).post(`/api/v1/tak-server/client-certificates/${secondRow?.id ?? ""}/revoke`).set("Cookie", admin.cookie).send({}).expect(200);
    assert.equal(await authenticateTakClient(second.certificateDer), null);
    const all = (await request(app).get("/api/v1/tak-server/client-certificates").set("Cookie", admin.cookie).expect(200)).body as Array<{
      status: string;
    }>;
    assert.deepEqual(all.map(({ status }) => status), ["revoked", "revoked"]);
    assert.equal(await database.auditEvent.count({ where: { action: "tak-server.client-certificate-revoked" } }), 2);
    await request(app).get("/api/v1/tak-server/client-certificates").set("Cookie", member.cookie).expect(403);
  });

  void it("ends live connections on revocation and when access ends", async () => {
    const client = await enrollTakClient(app, member);
    const authenticated = await authenticateTakClient(client.certificateDer);
    assert.ok(authenticated);

    const revokedSocket = fakeSocket();
    takConnections.track({ socket: revokedSocket, certificateDer: client.certificateDer, client: authenticated });
    const certificate = await database.takClientCertificate.findFirstOrThrow({ where: { userId: member.id } });
    await request(app).post(`/api/v1/me/tak-certificates/${certificate.id}/revoke`).set("Cookie", member.cookie).send({}).expect(200);
    assert.equal(revokedSocket.destroyed, true, "revocation disconnects immediately");

    const other = await enrollTakClient(app, member);
    const otherAuthenticated = await authenticateTakClient(other.certificateDer);
    assert.ok(otherAuthenticated);
    const removedSocket = fakeSocket();
    takConnections.track({ socket: removedSocket, certificateDer: other.certificateDer, client: otherAuthenticated });
    await database.eventMember.deleteMany({ where: { userId: member.id } });
    await takConnections.recheckAll();
    assert.equal(removedSocket.destroyed, true, "removed members are disconnected on the next recheck");
    assert.equal(takConnections.count(), 0);
  });
});
