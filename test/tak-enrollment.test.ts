import assert from "node:assert/strict";
import { randomUUID, X509Certificate } from "node:crypto";
import { rootCertificates } from "node:tls";
import { after, beforeEach, describe, it } from "node:test";
import type { Express } from "express";
import request from "supertest";
import { createApp } from "../src/app.js";
import { unzipSync, strFromU8 } from "fflate";
import forge from "node-forge";
import { activeCertificateAuthority } from "../src/modules/tak-server/certificate-authority.js";
import { createEnrollmentApp } from "../src/modules/tak-server/enrollment-app.js";
import { revokeUnusedPackageCertificates } from "../src/modules/tak-server/unused-packages.js";
import { generateRsaKeyPair, RSA_SIGNING, x509 } from "../src/modules/tak-server/x509.js";
import { database, disconnectDatabase } from "../src/shared/database/database.js";
import { clearDatabase, createEvent, createUser, type TestUser } from "./support/identity.js";

interface EnrollmentBody {
  username: string;
  martiPort: number;
  expiresAt: string | null;
  atakEnrollmentUrl: string | null;
  itakQrString: string | null;
  unusedPackageHours: number;
}

/** Pretends the listeners present a certificate chaining directly to a bundled public root. */
async function usePublicCertificate(): Promise<X509Certificate> {
  const root = new X509Certificate(rootCertificates[0] ?? "");
  await database.takServerCertificate.create({
    data: {
      id: randomUUID(),
      source: "acme",
      hostName: "tak.example.org",
      certificateChainPem: root.toString(),
      keyEnvelope: "placeholder",
      fingerprintSha256: "placeholder",
      subject: "CN=tak.example.org",
      notAfter: new Date(Date.now() + 60 * 24 * 60 * 60_000),
      activeSlot: "active",
    },
  });
  return root;
}

const PASSWORD = "A-secure-test-password-123!";

/** The username and QR token as ATAK takes them from the scanned enrollment link. */
function qrCredentials(created: EnrollmentBody): { username: string; token: string } {
  assert.ok(created.atakEnrollmentUrl, "QR enrollment is offered");
  const query = new URL(created.atakEnrollmentUrl.replace("tak://", "https://")).searchParams;
  return { username: query.get("username") ?? "", token: query.get("token") ?? "" };
}

let app: Express;
let enrollment: Express;
let admin: TestUser;
let member: TestUser;
let outsider: TestUser;
let eventId: string;

async function enableServer(ports: { martiPort?: number } = {}): Promise<void> {
  await request(app)
    .put("/api/v1/tak-server/settings")
    .set("Cookie", admin.cookie)
    .send({ version: 0, enabled: true, hostName: "tak.example.org", enrollmentPort: 8446, martiPort: 8443, streamingPort: 8089, clientCertificateDays: 30, ...ports, endpointChange: { notifyAffectedUsers: false } })
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

  void it("offers no QR enrollment while the server uses a certificate from its own CA", async () => {
    await enableServer();
    const created = await enroll(member);
    assert.deepEqual([created.username, created.atakEnrollmentUrl, created.itakQrString, created.expiresAt], ["peter", null, null, null]);
    assert.equal(await database.takEnrollmentToken.count(), 0);
  });

  void it("returns the account username and a QR token only for event members while the server is enabled", async () => {
    await request(app).post("/api/v1/me/tak-enrollments").set("Cookie", member.cookie).expect(409);
    await enableServer();
    await usePublicCertificate();
    const created = await enroll(member);
    assert.equal(created.username, "peter");
    assert.match(created.atakEnrollmentUrl ?? "", /^tak:\/\/com\.atakmap\.app\/enroll\?host=tak\.example\.org%3A8089&username=peter&token=/);
    assert.equal(created.itakQrString, "OpenMeshTak_tak.example.org,tak.example.org,8089,SSL");
    assert.doesNotMatch(created.atakEnrollmentUrl ?? "", /secure-test-password/, "the QR code never carries the password");
    await request(app).post("/api/v1/me/tak-enrollments").set("Cookie", outsider.cookie).expect(403);

    const stored = await database.takEnrollmentToken.findFirstOrThrow({ where: { userId: member.id } });
    assert.notEqual(stored.tokenHash, qrCredentials(created).token, "only the hash is stored");
  });

  void it("takes the QR token lifetime from the event: days, until the end, or without a limit", async () => {
    const DAY = 24 * 60 * 60_000;
    const near = (expiresAt: string | null, days: number): boolean =>
      Math.abs(new Date(expiresAt ?? "").getTime() - (Date.now() + days * DAY)) < 60_000;
    await enableServer();
    await usePublicCertificate();

    // Lifetime 0 and no end date: valid for good, and the token still works.
    const unlimited = await enroll(member);
    assert.equal(unlimited.expiresAt, null);
    await signClient(qrCredentials(unlimited), await csrFor("peter")).expect(200);

    const endsAt = new Date(Date.now() + 3 * DAY);
    await database.event.update({ where: { id: eventId }, data: { endsAt } });
    assert.equal((await enroll(member)).expiresAt, endsAt.toISOString());

    await database.event.update({ where: { id: eventId }, data: { takLoginTokenDays: 10 } });
    assert.ok(near((await enroll(member)).expiresAt, 10));

    // Another active event with a longer lifetime wins.
    const longer = await createEvent();
    await database.event.update({ where: { id: longer }, data: { status: "active", takLoginTokenDays: 20 } });
    const role = await database.eventRole.create({ data: { id: randomUUID(), eventId: longer, name: "P", slug: "p" } });
    const group = await database.eventGroup.create({ data: { id: randomUUID(), eventId: longer, name: "C", slug: "c", shortNamePrefix: "C" } });
    await database.eventMember.create({
      data: { id: randomUUID(), eventId: longer, userId: member.id, eventRoleId: role.id, eventGroupId: group.id, username: "Peter", callsign: "Peter", shortNameNumber: 1 },
    });
    assert.ok(near((await enroll(member)).expiresAt, 20));

    // Without an active event, e.g. an administrator, the token lasts 30 days.
    await database.event.updateMany({ data: { status: "archived" } });
    const administrator = await createUser("Operator", [{ permission: "tak-server.admin-access" }]);
    assert.ok(near((await enroll(administrator)).expiresAt, 30));
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
    // One valid certificate per device: re-enrolling the same device UID replaces the earlier one.
    const rows = await database.takClientCertificate.findMany({ where: { userId: member.id }, orderBy: { createdAt: "asc" } });
    assert.equal(rows.length, 2);
    assert.ok(rows[0]?.revokedAt, "the replaced certificate is revoked");
    assert.equal(rows[1]?.revokedAt, null);
  });

  void it("enrolls repeatedly with the QR token and rejects wrong logins", async () => {
    await enableServer();
    const publicRoot = await usePublicCertificate();
    const credentials = qrCredentials(await enroll(member));
    const first = await signClient(credentials, await csrFor("peter")).expect(200);
    const authorities = Object.entries(JSON.parse(first.text) as Record<string, string>)
      .filter(([key]) => /^ca\d+$/.test(key))
      .map(([, value]) => new X509Certificate(Buffer.from(value, "base64")));
    assert.ok(
      authorities.some(({ fingerprint256 }) => fingerprint256 === publicRoot.fingerprint256),
      "the QR-enrolled connection trusts the public server root",
    );
    await signClient(credentials, await csrFor("peter")).expect(200);

    await signClient(credentials, await csrFor("someone-else")).expect(400);
    await signClient({ ...credentials, username: "outsider" }, await csrFor("outsider")).expect(401);
    await signClient({ username: "peter", token: "wrong-password" }, await csrFor("peter")).expect(401);
    await signClient({ username: "nobody", token: PASSWORD }, await csrFor("nobody")).expect(401);
  });

  void it("revokes unused QR tokens when a new QR code is created, but keeps used ones", async () => {
    await enableServer();
    await usePublicCertificate();
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
    await usePublicCertificate();
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

  void it("offers a separate iTAK package with a fresh user-bound client identity", async () => {
    await enableServer({ martiPort: 8484 });
    const response = await request(app)
      .get("/api/v1/me/itak-connection-package")
      .set("Cookie", member.cookie)
      .buffer(true)
      .parse((res, callback) => {
        const chunks: Buffer[] = [];
        res.on("data", (chunk: Buffer) => chunks.push(chunk));
        res.on("end", () => callback(null, Buffer.concat(chunks)));
      })
      .expect(200);
    assert.equal(response.headers["cache-control"], "no-store");
    const files = unzipSync(new Uint8Array(response.body as Buffer));
    assert.ok(files["manifest.xml"]);
    assert.ok(files["client.p12"]);
    assert.ok(files["truststore.p12"]);
    const preferences = strFromU8(files["openmeshtak.pref"] ?? new Uint8Array());
    assert.match(preferences, /tak\.example\.org:8089:ssl/);
    assert.match(preferences, /key="apiSecureServerPort"[^>]*>8484</);

    const certificate = await database.takClientCertificate.findFirstOrThrow({ where: { userId: member.id } });
    assert.match(certificate.clientUid ?? "", /^ITAK-PACKAGE-/);
    assert.equal(await database.auditEvent.count({ where: { action: "tak-server.client-certificate-issued" } }), 1);
    assert.equal(await database.auditEvent.count({ where: { action: "tak-server.itak-connection-package-downloaded" } }), 1);

    // Every download is a further device; unused ones expire instead of blocking a new package.
    assert.equal((await enroll(member)).unusedPackageHours, 24);
    await request(app).get("/api/v1/me/itak-connection-package").set("Cookie", member.cookie).expect(200);
    assert.equal(await database.takClientCertificate.count({ where: { userId: member.id, revokedAt: null } }), 2);
  });

  void it("offers a WinTAK package with its own device UID prefix", async () => {
    await enableServer();
    await request(app).get("/api/v1/me/itak-connection-package").set("Cookie", member.cookie).expect(200);
    const response = await request(app).get("/api/v1/me/wintak-connection-package").set("Cookie", member.cookie).expect(200);
    assert.match(response.headers["content-disposition"] ?? "", /OpenMeshTak-WinTAK-tak\.example\.org\.zip/);

    const certificate = await database.takClientCertificate.findFirstOrThrow({
      where: { userId: member.id, clientUid: { startsWith: "WINTAK-PACKAGE-" } },
    });
    assert.equal(await database.auditEvent.count({ where: { action: "tak-server.wintak-connection-package-downloaded" } }), 1);
    assert.equal(certificate.revokedAt, null);
  });

  void it("revokes downloaded packages that never connected within the configured hours", async () => {
    await enableServer();
    await request(app).get("/api/v1/me/itak-connection-package").set("Cookie", member.cookie).expect(200);
    await request(app).get("/api/v1/me/wintak-connection-package").set("Cookie", member.cookie).expect(200);
    const [unused, used] = await database.takClientCertificate.findMany({ where: { userId: member.id }, orderBy: { createdAt: "asc" } });
    assert.ok(unused && used);
    await database.takClientCertificate.update({ where: { id: used.id }, data: { firstConnectedAt: new Date() } });

    assert.equal(await revokeUnusedPackageCertificates(new Date(Date.now() + 23 * 3_600_000)), 0);
    assert.equal(await revokeUnusedPackageCertificates(new Date(Date.now() + 25 * 3_600_000)), 1);
    const revoked = await database.takClientCertificate.findUniqueOrThrow({ where: { id: unused.id } });
    assert.equal(revoked.revocationReason, "Package not imported within 24 hours");
    assert.equal((await database.takClientCertificate.findUniqueOrThrow({ where: { id: used.id } })).revokedAt, null);
  });

  void it("serves the enrollment profile with the public Marti port for a valid TAK login", async () => {
    // An explicitly chosen alternative Marti port, as on hosts where CloudPanel owns 8443.
    await enableServer({ martiPort: 8484 });
    assert.equal((await enroll(member)).martiPort, 8484);
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
    const preferences = strFromU8(files["preferences/preference.pref"] ?? new Uint8Array());
    assert.match(preferences, /deviceProfileEnableOnConnect/);
    assert.match(preferences, /<entry key="apiSecureServerPort" class="class java.lang.String">8484<\/entry>/);
  });

  void it("refuses enrollment when the member left before signing", async () => {
    await enableServer();
    await database.eventMember.deleteMany({ where: { userId: member.id } });
    await signClient({ username: "peter", token: PASSWORD }, await csrFor("peter")).expect(401);
  });
});
