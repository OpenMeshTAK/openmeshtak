import assert from "node:assert/strict";
import { after, beforeEach, describe, it } from "node:test";
import type { Express } from "express";
import request from "supertest";
import { createApp } from "../src/app.js";
import { exportPrivateKeyPem, generateRsaKeyPair, RSA_SIGNING, x509 } from "../src/modules/tak-server/x509.js";
import { database, disconnectDatabase } from "../src/shared/database/database.js";
import { clearDatabase, createUser, type TestUser } from "./support/identity.js";

interface AuthorityBody {
  id: string;
  origin: string;
  active: boolean;
  fingerprintSha256: string;
  certificatePem: string;
}

let app: Express;
let admin: TestUser;

const url = "/api/v1/tak-server/certificate-authorities";

async function list(): Promise<AuthorityBody[]> {
  return (await request(app).get(url).set("Cookie", admin.cookie).expect(200)).body as AuthorityBody[];
}

/** An externally created CA, as an organization might bring along. */
async function externalAuthority(isCa = true): Promise<{ certificatePem: string; privateKeyPem: string }> {
  const keys = await generateRsaKeyPair();
  const certificate = await x509.X509CertificateGenerator.createSelfSigned({
    serialNumber: "0a",
    name: "CN=Imported test CA",
    notBefore: new Date(Date.now() - 60_000),
    notAfter: new Date(Date.now() + 365 * 86_400_000),
    keys,
    signingAlgorithm: RSA_SIGNING,
    extensions: [new x509.BasicConstraintsExtension(isCa, undefined, true)],
  });
  return { certificatePem: certificate.toString("pem"), privateKeyPem: await exportPrivateKeyPem(keys.privateKey) };
}

void describe("TAK certificate authorities", () => {
  beforeEach(async () => {
    await clearDatabase();
    app = createApp();
    admin = await createUser("Admin", [{ permission: "tak-server.manage" }]);
  });

  after(async () => {
    await clearDatabase();
    await disconnectDatabase();
  });

  void it("creates one CA for the installation and never exposes its key", async () => {
    const [first, ...rest] = await list();
    assert.equal(rest.length, 0);
    assert.equal(first?.origin, "generated");
    assert.equal(first?.active, true);
    const certificate = new x509.X509Certificate(first?.certificatePem ?? "");
    assert.equal(certificate.getExtension(x509.BasicConstraintsExtension)?.ca, true);

    assert.deepEqual((await list()).map(({ id }) => id), [first?.id], "the same CA on every call");
    const row = await database.takCertificateAuthority.findUniqueOrThrow({ where: { id: first?.id ?? "" } });
    assert.equal(row.keyEnvelope.includes("PRIVATE KEY"), false);
    assert.equal(JSON.stringify(await list()).includes("PRIVATE KEY"), false);
  });

  void it("imports an existing CA as the active one and keeps the old one trusted", async () => {
    const [generated] = await list();
    const external = await externalAuthority();

    const imported = (await request(app).post(`${url}/import`).set("Cookie", admin.cookie).send(external).expect(201))
      .body as AuthorityBody;
    assert.equal(imported.origin, "imported");
    assert.equal(imported.active, true);
    assert.deepEqual(
      (await list()).map(({ id, active }) => [id, active]),
      [[imported.id, true], [generated?.id, false]],
    );

    const audit = await database.auditEvent.findFirstOrThrow({ where: { action: "tak-server.certificate-authority-imported" } });
    assert.equal(JSON.stringify(audit).includes("PRIVATE KEY"), false);
    await request(app).post(`${url}/import`).set("Cookie", admin.cookie).send(external).expect(422);
  });

  void it("rejects certificates that are no CA and keys that do not match", async () => {
    const notCa = await externalAuthority(false);
    await request(app).post(`${url}/import`).set("Cookie", admin.cookie).send(notCa).expect(422);

    const first = await externalAuthority();
    const second = await externalAuthority();
    const mismatch = await request(app)
      .post(`${url}/import`)
      .set("Cookie", admin.cookie)
      .send({ certificatePem: first.certificatePem, privateKeyPem: second.privateKeyPem })
      .expect(422);
    assert.equal((mismatch.body as { errors: Array<{ field: string }> }).errors[0]?.field, "privateKeyPem");
  });

  void it("is only available to holders of tak-server.manage", async () => {
    const other = await createUser("Editor", [{ permission: "events.manage" }]);
    await request(app).get(url).set("Cookie", other.cookie).expect(403);
    await request(app).post(`${url}/import`).set("Cookie", other.cookie).send(await externalAuthority()).expect(403);
  });
});
