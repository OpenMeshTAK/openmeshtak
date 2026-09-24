import assert from "node:assert/strict";
import { randomUUID, X509Certificate } from "node:crypto";
import { after, beforeEach, describe, it } from "node:test";
import type { Express } from "express";
import request from "supertest";
import { createApp } from "../src/app.js";
import { createEnrollmentApp } from "../src/modules/tak-server/enrollment-app.js";
import { generateRsaKeyPair, RSA_SIGNING, x509 } from "../src/modules/tak-server/x509.js";
import { database, disconnectDatabase } from "../src/shared/database/database.js";
import { clearDatabase, createEvent, createUser, type TestUser } from "./support/identity.js";

interface EnrollmentBody {
  username: string;
  token: string;
  atakEnrollmentUrl: string;
}

let app: Express;
let enrollment: Express;
let admin: TestUser;
let member: TestUser;
let outsider: TestUser;
let eventId: string;

async function enableServer(): Promise<void> {
  await request(app)
    .put("/api/v1/tak-server/settings")
    .set("Cookie", admin.cookie)
    .send({ version: 0, enabled: true, hostName: "tak.example.org", enrollmentPort: 8446, martiPort: 8443, streamingPort: 8089, clientCertificateDays: 30 })
    .expect(200);
}

async function enroll(user: TestUser): Promise<EnrollmentBody> {
  return (await request(app).post("/api/v1/me/tak-enrollments").set("Cookie", user.cookie).expect(201)).body as EnrollmentBody;
}

/** A CSR as ATAK sends it: bare base64 DER for the given common name. */
async function csrFor(commonName: string): Promise<string> {
  const keys = await generateRsaKeyPair();
  const csr = await x509.Pkcs10CertificateRequestGenerator.create({
    name: `CN=${commonName}, O=Somewhere`,
    keys,
    signingAlgorithm: RSA_SIGNING,
  });
  return Buffer.from(csr.rawData).toString("base64");
}

function signClient(credentials: { username: string; token: string }, csr: string, accept = "application/json"): request.Test {
  return request(enrollment)
    .post("/Marti/api/tls/signClient/v2?clientUid=ANDROID-1234&version=3")
    .auth(credentials.username, credentials.token)
    .set("Accept", accept)
    .set("Content-Type", "text/plain")
    .send(csr);
}

void describe("TAK certificate enrollment", () => {
  beforeEach(async () => {
    await clearDatabase();
    app = createApp();
    enrollment = createEnrollmentApp();
    admin = await createUser("Admin", [{ permission: "tak-server.manage" }]);
    member = await createUser("Peter", []);
    outsider = await createUser("Outsider", []);
    eventId = await createEvent();
    await database.event.update({ where: { id: eventId }, data: { status: "active" } });
    const roleId = randomUUID();
    const groupId = randomUUID();
    await database.eventRole.create({ data: { id: roleId, eventId, name: "Participant", slug: "participant" } });
    await database.eventGroup.create({ data: { id: groupId, eventId, name: "Bravo", slug: "bravo", shortNamePrefix: "B" } });
    await database.eventMember.create({
      data: { id: randomUUID(), eventId, userId: member.id, eventRoleId: roleId, eventGroupId: groupId, username: "Peter", callsign: "Peter", shortNameNumber: 1 },
    });
  });

  after(async () => {
    await clearDatabase();
    await disconnectDatabase();
  });

  void it("creates single-use enrollments only for event members while the server is enabled", async () => {
    await request(app).post("/api/v1/me/tak-enrollments").set("Cookie", member.cookie).expect(409);
    await enableServer();
    const created = await enroll(member);
    assert.equal(created.username, member.id);
    assert.match(created.atakEnrollmentUrl, /^tak:\/\/com\.atakmap\.app\/enroll\?host=tak\.example\.org%3A8089&username=/);
    await request(app).post("/api/v1/me/tak-enrollments").set("Cookie", outsider.cookie).expect(403);

    const stored = await database.takEnrollmentToken.findFirstOrThrow({ where: { userId: member.id } });
    assert.notEqual(stored.tokenHash, created.token, "only the hash is stored");
  });

  void it("signs the CSR of an enrolling app and returns the CA chain", async () => {
    await enableServer();
    const credentials = await enroll(member);
    const response = await signClient(credentials, await csrFor(member.id)).expect(200);
    const body = JSON.parse(response.text) as { signedCert: string; ca0: string };

    const signed = new X509Certificate(Buffer.from(body.signedCert, "base64"));
    const ca = new X509Certificate(Buffer.from(body.ca0, "base64"));
    assert.ok(signed.verify(ca.publicKey), "signed by the returned CA");
    assert.match(signed.subject, new RegExp(`CN=${member.id}`));
    assert.doesNotMatch(signed.subject, /Somewhere/, "Core sets the subject itself");
    assert.ok(signed.keyUsage?.includes("1.3.6.1.5.5.7.3.2"), "client authentication only");

    const row = await database.takClientCertificate.findFirstOrThrow({ where: { userId: member.id } });
    assert.equal(row.clientUid, "ANDROID-1234");
    await signClient(credentials, await csrFor(member.id)).expect(401);
  });

  void it("rejects foreign common names without using up the token", async () => {
    await enableServer();
    const credentials = await enroll(member);
    await signClient(credentials, await csrFor("someone-else")).expect(400);
    await signClient({ ...credentials, username: outsider.id }, await csrFor(outsider.id)).expect(401);
    await signClient({ ...credentials, token: "wrong" }, await csrFor(member.id)).expect(401);
    await signClient(credentials, await csrFor(member.id)).expect(200);
  });

  void it("lets TAK administrators enroll without event membership and answers in XML on request", async () => {
    await enableServer();
    const takAdmin = await createUser("Operator", [{ permission: "tak-server.admin-access" }]);
    const credentials = await enroll(takAdmin);
    const response = await signClient(credentials, await csrFor(takAdmin.id), "application/xml").expect(200);
    assert.match(response.text, /^<\?xml[\s\S]*<enrollment><signedCert>[A-Za-z0-9+/=]+<\/signedCert><ca>/);

    const config = await request(enrollment).get("/Marti/api/tls/config").expect(200);
    assert.match(config.text, /nameEntry name="O" value="OpenMeshTak"/);
  });

  void it("refuses enrollment when the member left before signing", async () => {
    await enableServer();
    const credentials = await enroll(member);
    await database.eventMember.deleteMany({ where: { userId: member.id } });
    await signClient(credentials, await csrFor(member.id)).expect(401);
  });
});
