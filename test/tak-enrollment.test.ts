import assert from "node:assert/strict";
import { randomUUID, X509Certificate } from "node:crypto";
import { after, beforeEach, describe, it } from "node:test";
import type { Express } from "express";
import request from "supertest";
import { createApp } from "../src/app.js";
import { unzipSync, strFromU8 } from "fflate";
import forge from "node-forge";
import { activeCertificateAuthority } from "../src/modules/tak-server/certificate-authority.js";
import { createEnrollmentApp } from "../src/modules/tak-server/enrollment-app.js";
import { generateRsaKeyPair, RSA_SIGNING, x509 } from "../src/modules/tak-server/x509.js";
import { database, disconnectDatabase } from "../src/shared/database/database.js";
import { clearDatabase, createEvent, createUser, type TestUser } from "./support/identity.js";

interface EnrollmentBody {
  username: string;
  expiresAt: string;
  atakEnrollmentUrl: string;
}

const PASSWORD = "A-secure-test-password-123!";

/** The username and QR token as ATAK takes them from the scanned enrollment link. */
function qrCredentials(created: EnrollmentBody): { username: string; token: string } {
  const query = new URL(created.atakEnrollmentUrl.replace("tak://", "https://")).searchParams;
  return { username: query.get("username") ?? "", token: query.get("token") ?? "" };
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

  void it("returns the account username and a QR token only for event members while the server is enabled", async () => {
    await request(app).post("/api/v1/me/tak-enrollments").set("Cookie", member.cookie).expect(409);
    await enableServer();
    const created = await enroll(member);
    assert.equal(created.username, "peter");
    assert.match(created.atakEnrollmentUrl, /^tak:\/\/com\.atakmap\.app\/enroll\?host=tak\.example\.org%3A8089&username=peter&token=/);
    assert.doesNotMatch(created.atakEnrollmentUrl, /secure-test-password/, "the QR code never carries the password");
    await request(app).post("/api/v1/me/tak-enrollments").set("Cookie", outsider.cookie).expect(403);

    const stored = await database.takEnrollmentToken.findFirstOrThrow({ where: { userId: member.id } });
    assert.notEqual(stored.tokenHash, qrCredentials(created).token, "only the hash is stored");
  });

  void it("keeps the QR token valid until the latest event ends, otherwise for 30 days", async () => {
    await enableServer();
    const fallback = new Date((await enroll(member)).expiresAt).getTime();
    assert.ok(Math.abs(fallback - (Date.now() + 30 * 24 * 60 * 60_000)) < 60_000);

    const endsAt = new Date(Date.now() + 3 * 24 * 60 * 60_000);
    await database.event.update({ where: { id: eventId }, data: { endsAt } });
    assert.equal((await enroll(member)).expiresAt, endsAt.toISOString());
  });

  void it("signs the CSR of an app that logs in with the username and account password", async () => {
    await enableServer();
    const credentials = { username: "Peter", token: PASSWORD };
    const response = await signClient(credentials, await csrFor("Peter")).expect(200);
    const body = JSON.parse(response.text) as { signedCert: string; ca0: string };

    const signed = new X509Certificate(Buffer.from(body.signedCert, "base64"));
    const ca = new X509Certificate(Buffer.from(body.ca0, "base64"));
    assert.ok(signed.verify(ca.publicKey), "signed by the returned CA");
    assert.match(signed.subject, new RegExp(`CN=${member.id}`), "the certificate names the user ID");
    assert.doesNotMatch(signed.subject, /Somewhere/, "Core sets the subject itself");
    assert.ok(signed.keyUsage?.includes("1.3.6.1.5.5.7.3.2"), "client authentication only");

    const row = await database.takClientCertificate.findFirstOrThrow({ where: { userId: member.id } });
    assert.equal(row.clientUid, "ANDROID-1234");
    // The same login works again, e.g. when the app re-enrolls after its certificate expired.
    await signClient(credentials, await csrFor("peter")).expect(200);
  });

  void it("enrolls repeatedly with the QR token and rejects wrong logins", async () => {
    await enableServer();
    const credentials = qrCredentials(await enroll(member));
    await signClient(credentials, await csrFor("peter")).expect(200);
    await signClient(credentials, await csrFor("peter")).expect(200);

    await signClient(credentials, await csrFor("someone-else")).expect(400);
    await signClient({ ...credentials, username: "outsider" }, await csrFor("outsider")).expect(401);
    await signClient({ username: "peter", token: "wrong-password" }, await csrFor("peter")).expect(401);
    await signClient({ username: "nobody", token: PASSWORD }, await csrFor("nobody")).expect(401);
  });

  void it("revokes unused QR tokens when a new QR code is created, but keeps used ones", async () => {
    await enableServer();
    const used = qrCredentials(await enroll(member));
    await signClient(used, await csrFor("peter")).expect(200);
    const unused = qrCredentials(await enroll(member));
    const newest = qrCredentials(await enroll(member));

    await signClient(unused, await csrFor("peter")).expect(401);
    await signClient(used, await csrFor("peter")).expect(200);
    await signClient(newest, await csrFor("peter")).expect(200);
  });

  void it("refuses disabled accounts and expired QR tokens", async () => {
    await enableServer();
    const credentials = qrCredentials(await enroll(member));
    await database.takEnrollmentToken.updateMany({ where: { userId: member.id }, data: { expiresAt: new Date(Date.now() - 1000) } });
    await signClient(credentials, await csrFor("peter")).expect(401);

    await database.domainUser.update({ where: { id: member.id }, data: { disabledAt: new Date() } });
    await signClient({ username: "peter", token: PASSWORD }, await csrFor("peter")).expect(401);
  });

  void it("lets TAK administrators enroll without event membership and answers in XML on request", async () => {
    await enableServer();
    await createUser("Operator", [{ permission: "tak-server.admin-access" }]);
    const response = await signClient({ username: "operator", token: PASSWORD }, await csrFor("operator"), "application/xml").expect(200);
    assert.match(response.text, /^<\?xml[\s\S]*<enrollment><signedCert>[A-Za-z0-9+/=]+<\/signedCert><ca>/);

    const config = await request(enrollment).get("/Marti/api/tls/config").expect(200);
    assert.match(config.text, /nameEntry name="O" value="OpenMeshTak"/);
  });

  void it("offers a connection package that trusts the OpenMeshTak CA and holds no secrets", async () => {
    await request(app).get("/api/v1/me/tak-connection-package").set("Cookie", member.cookie).expect(409);
    await enableServer();
    await request(app).get("/api/v1/me/tak-connection-package").set("Cookie", outsider.cookie).expect(403);
    const response = await request(app)
      .get("/api/v1/me/tak-connection-package")
      .set("Cookie", member.cookie)
      .buffer(true)
      .parse((res, callback) => {
        const chunks: Buffer[] = [];
        res.on("data", (chunk: Buffer) => chunks.push(chunk));
        res.on("end", () => callback(null, Buffer.concat(chunks)));
      })
      .expect(200);
    const files = unzipSync(new Uint8Array(response.body as Buffer));
    const preferences = strFromU8(files["config.pref"] ?? new Uint8Array());
    assert.match(preferences, /tak.example.org:8089:ssl/);
    assert.match(preferences, /enrollForCertificateWithTrust0[^>]*>true</);
    assert.ok(files["MANIFEST/manifest.xml"]);

    const p12 = forge.pkcs12.pkcs12FromAsn1(forge.asn1.fromDer(forge.util.binary.raw.encode(files["certs/openmeshtak-truststore.p12"] ?? new Uint8Array())), "openmeshtak");
    const certBag = forge.pki.oids.certBag ?? "";
    const keyBag = forge.pki.oids.pkcs8ShroudedKeyBag ?? "";
    const bags = p12.getBags({ bagType: certBag })[certBag] ?? [];
    const authority = await activeCertificateAuthority();
    assert.equal(bags.length, 1);
    const truststoreCertificate = forge.pki.certificateToPem(bags[0]?.cert as forge.pki.Certificate);
    assert.equal(new X509Certificate(truststoreCertificate).fingerprint256, new X509Certificate(authority.certificatePem).fingerprint256);
    assert.equal(p12.getBags({ bagType: keyBag })[keyBag]?.length ?? 0, 0, "no key");
  });

  void it("serves the enrollment profile for a valid TAK login", async () => {
    await enableServer();
    const profileUrl = "/Marti/api/tls/profile/enrollment?clientUid=ANDROID-1234";
    await request(enrollment).get(profileUrl).auth("peter", "wrong-password").expect(401);

    const profile = await request(enrollment)
      .get(profileUrl)
      .auth("peter", PASSWORD)
      .buffer(true)
      .parse((res, callback) => {
        const chunks: Buffer[] = [];
        res.on("data", (chunk: Buffer) => chunks.push(chunk));
        res.on("end", () => callback(null, Buffer.concat(chunks)));
      })
      .expect(200);
    const files = unzipSync(new Uint8Array(profile.body as Buffer));
    assert.match(strFromU8(files["preferences/preference.pref"] ?? new Uint8Array()), /deviceProfileEnableOnConnect/);
  });

  void it("refuses enrollment when the member left before signing", async () => {
    await enableServer();
    await database.eventMember.deleteMany({ where: { userId: member.id } });
    await signClient({ username: "peter", token: PASSWORD }, await csrFor("peter")).expect(401);
  });
});
