import assert from "node:assert/strict";
import { randomUUID, X509Certificate } from "node:crypto";
import { after, beforeEach, describe, it } from "node:test";
import type { Express } from "express";
import request from "supertest";
import { createApp } from "../src/app.js";
import { setEmailDeliveryForTests, type OutgoingEmail } from "../src/modules/email/mailer.js";
import { activeCertificateAuthority } from "../src/modules/tak-server/certificate-authority.js";
import {
  addServerCertificate,
  currentServerCertificate,
  publicTrustAnchor,
  publicTrustAnchors,
} from "../src/modules/tak-server/server-certificate.js";
import { database, disconnectDatabase } from "../src/shared/database/database.js";
import { clearDatabase, createUser, type TestUser } from "./support/identity.js";
import { publicChain } from "./support/public-chain.js";

interface SettingsBody {
  enabled: boolean;
  hostName: string | null;
  version: number;
  serverCertificate: { source: string; hostName: string } | null;
}

let app: Express;
let admin: TestUser;

const settingsUrl = "/api/v1/tak-server/settings";

function save(body: Record<string, unknown>): request.Test {
  return request(app)
    .put(settingsUrl)
    .set("Cookie", admin.cookie)
    .send({ enrollmentPort: 8446, martiPort: 8443, streamingPort: 8089, clientCertificateDays: 365, enabled: false, ...body });
}

void describe("TAK server settings", () => {
  beforeEach(async () => {
    await clearDatabase();
    app = createApp();
    admin = await createUser("Admin", [{ permission: "tak-server.manage" }]);
  });

  after(async () => {
    await clearDatabase();
    await disconnectDatabase();
  });

  void it("validates and stores the settings", async () => {
    const initial = (await request(app).get(settingsUrl).set("Cookie", admin.cookie).expect(200)).body as SettingsBody;
    assert.deepEqual([initial.version, initial.enabled, initial.serverCertificate], [0, false, null]);

    const invalid = await save({ version: 0, hostName: "not a host", enabled: true, martiPort: 8446 }).expect(422);
    assert.deepEqual(
      (invalid.body as { errors: Array<{ code: string }> }).errors.map(({ code }) => code).sort(),
      ["DUPLICATE_PORT", "INVALID_HOST_NAME"],
    );
    await save({ version: 0, hostName: null, enabled: true }).expect(422);

    const saved = (await save({ version: 0, hostName: " TAK.Example.org ", enabled: true }).expect(200)).body as SettingsBody;
    assert.deepEqual([saved.hostName, saved.enabled, saved.version], ["tak.example.org", true, 1]);
    await save({ version: 0, hostName: "tak.example.org" }).expect(409);
  });

  void it("issues the server certificate from the OpenMeshTak CA for the host name", async () => {
    const issued = await currentServerCertificate("tak.example.org");
    const authority = await activeCertificateAuthority();
    const leaf = new X509Certificate(issued.certificateChainPem);
    assert.equal(leaf.checkHost("tak.example.org"), "tak.example.org");
    assert.ok(leaf.verify(new X509Certificate(authority.certificatePem).publicKey), "signed by the active CA");

    assert.equal((await currentServerCertificate("tak.example.org")).id, issued.id, "reused while valid");
    assert.notEqual((await currentServerCertificate("tak2.example.org")).id, issued.id, "reissued for a new host");
  });

  void it("uses an added publicly trusted certificate such as Let's Encrypt", async () => {
    const chain = await publicChain("tak.example.org");
    const added = await addServerCertificate(chain.chainPem, chain.keyPem, "tak.example.org", { trustedRoots: [chain.rootPem] });
    assert.equal((await currentServerCertificate("tak.example.org")).id, added.id);
    assert.equal(publicTrustAnchor(chain.chainPem, { trustedRoots: [chain.rootPem] }), new X509Certificate(chain.rootPem).toString());
    assert.deepEqual(
      publicTrustAnchors(chain.chainPem, { trustedRoots: [chain.rootPem] })?.map((pem) => new X509Certificate(pem).subject),
      ["CN=Test R10", "CN=Test Public Root"],
    );

    await assert.rejects(addServerCertificate(chain.chainPem, chain.keyPem, "other.example.org", { trustedRoots: [chain.rootPem] }));
    const leafOnly = chain.chainPem.slice(0, chain.chainPem.indexOf("-----END CERTIFICATE-----") + 25);
    await assert.rejects(addServerCertificate(leafOnly, chain.keyPem, "tak.example.org", { trustedRoots: [chain.rootPem] }));
  });

  void it("adds and removes the server certificate through the API", async () => {
    await save({ version: 0, hostName: "tak.example.org" }).expect(200);
    const chain = await publicChain("tak.example.org");
    const rejected = await request(app)
      .put("/api/v1/tak-server/server-certificate")
      .set("Cookie", admin.cookie)
      .send({ certificateChainPem: chain.chainPem, privateKeyPem: chain.keyPem })
      .expect(422);
    assert.match(JSON.stringify(rejected.body), /publicly trusted root/, "test roots are not public roots");

    await addServerCertificate(chain.chainPem, chain.keyPem, "tak.example.org", { trustedRoots: [chain.rootPem] });
    const removed = (await request(app).delete("/api/v1/tak-server/server-certificate").set("Cookie", admin.cookie).expect(200))
      .body as SettingsBody;
    assert.equal(removed.serverCertificate, null);
    assert.equal((await currentServerCertificate("tak.example.org")).source, "issued");
  });

  void it("switches from an ACME certificate back to the OpenMeshTak CA and stops ACME", async () => {
    await save({ version: 0, hostName: "tak.example.org" }).expect(200);
    await database.takAcmeSettings.create({ data: { id: "tak-acme", enabled: true } });
    const chain = await publicChain("tak.example.org");
    await addServerCertificate(chain.chainPem, chain.keyPem, "tak.example.org", { trustedRoots: [chain.rootPem], source: "acme" });

    await request(app).delete("/api/v1/tak-server/server-certificate").set("Cookie", admin.cookie).expect(200);
    assert.equal((await currentServerCertificate("tak.example.org")).source, "issued");
    assert.equal((await database.takAcmeSettings.findUniqueOrThrow({ where: { id: "tak-acme" } })).enabled, false);
  });

  void it("requires a confirmed decision for non-standard ports and audits it", async () => {
    await save({ version: 0, hostName: "tak.example.org" }).expect(200);
    const refused = await save({ version: 1, hostName: "tak.example.org", martiPort: 8484 }).expect(422);
    assert.deepEqual(
      (refused.body as { errors: Array<{ code: string }> }).errors.map(({ code }) => code),
      ["ENDPOINT_CHANGE_CONFIRMATION_REQUIRED"],
    );

    await save({ version: 1, hostName: "tak.example.org", martiPort: 8484, endpointChange: { notifyAffectedUsers: false } }).expect(200);
    const audits = await database.auditEvent.findMany({ where: { action: "tak-server.settings-updated" } });
    const choices = audits.map(({ metadata }) => (metadata as { nonStandardPorts: string[] }).nonStandardPorts);
    assert.deepEqual(choices.filter((ports) => ports.length > 0), [["martiPort"]]);
    // Keeping the chosen port needs no new confirmation.
    await save({ version: 2, hostName: "tak.example.org", martiPort: 8484, clientCertificateDays: 30 }).expect(200);
  });

  void it("marks enrolled apps for re-enrollment when the endpoint changes and emails their users on request", async () => {
    await save({ version: 0, hostName: "tak.example.org" }).expect(200);
    const member = await createUser("Peter", []);
    await database.user.update({ where: { id: member.authSubjectId }, data: { emailVerified: true } });
    await database.takClientCertificate.create({
      data: {
        id: randomUUID(),
        userId: member.id,
        caId: randomUUID(),
        serialNumber: "01",
        fingerprintSha256: "aa".repeat(32),
        commonName: member.id,
        notBefore: new Date(Date.now() - 60_000),
        notAfter: new Date(Date.now() + 86_400_000),
      },
    });
    await database.emailSettings.create({ data: { id: "email", enabled: true, host: "smtp.example.org", fromAddress: "noreply@example.org" } });
    const outbox: OutgoingEmail[] = [];
    setEmailDeliveryForTests((_settings, message) => {
      outbox.push(message);
      return Promise.resolve();
    });

    try {
      // A change unrelated to the endpoint needs no decision.
      await save({ version: 1, hostName: "tak.example.org", clientCertificateDays: 90 }).expect(200);
      await save({ version: 2, hostName: "tak2.example.org" }).expect(422);

      const moved = (
        await save({ version: 2, hostName: "tak2.example.org", endpointChange: { notifyAffectedUsers: true } }).expect(200)
      ).body as { endpointChangedAt: string | null; validClientCertificates: number; clientCertificatesToReEnroll: number };
      assert.notEqual(moved.endpointChangedAt, null);
      assert.deepEqual([moved.validClientCertificates, moved.clientCertificatesToReEnroll], [1, 1]);

      await new Promise((resolve) => setTimeout(resolve, 150));
      assert.equal(outbox.length, 1);
      assert.match(outbox[0]?.text ?? "", /moved to tak2.example.org/);

      const certificates = (await request(app).get("/api/v1/tak-server/client-certificates").set("Cookie", admin.cookie).expect(200))
        .body as Array<{ issuedForOldEndpoint: boolean }>;
      assert.deepEqual(certificates.map(({ issuedForOldEndpoint }) => issuedForOldEndpoint), [true]);
    } finally {
      setEmailDeliveryForTests(null);
    }
  });

  void it("is only available to holders of tak-server.manage", async () => {
    const other = await createUser("Editor", [{ permission: "events.manage" }]);
    await request(app).get(settingsUrl).set("Cookie", other.cookie).expect(403);
  });
});
