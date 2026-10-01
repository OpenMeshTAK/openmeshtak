import type { Express } from "express";
import request from "supertest";
import { createEnrollmentApp } from "../../src/modules/tak-server/enrollment-app.js";
import { exportPrivateKeyPem, generateRsaKeyPair, RSA_SIGNING, x509 } from "../../src/modules/tak-server/x509.js";
import type { TestUser } from "./identity.js";

export async function enableTakServer(app: Express, admin: TestUser): Promise<void> {
  await request(app)
    .put("/api/v1/tak-server/settings")
    .set("Cookie", admin.cookie)
    .send({
      version: 0,
      enabled: true,
      hostName: "tak.example.org",
      enrollmentPort: 8446,
      martiPort: 8443,
      streamingPort: 8089,
      clientCertificateDays: 30,
    })
    .expect(200);
}

export interface EnrolledClient {
  /** DER client certificate, as a TLS peer certificate presents it. */
  certificateDer: Buffer;
  certificatePem: string;
  privateKeyPem: string;
  caPems: string[];
}

function pemOf(base64Der: string): string {
  return new x509.X509Certificate(Buffer.from(base64Der, "base64")).toString("pem");
}

/** Runs the complete enrollment a TAK app performs and returns its certificate and key. */
export async function enrollTakClient(app: Express, user: TestUser): Promise<EnrolledClient> {
  const created = (await request(app).post("/api/v1/me/tak-enrollments").set("Cookie", user.cookie).expect(201))
    .body as { username: string };
  // Logs in with the username and account password, like a manually configured app.
  const enrollment = { username: created.username, token: "A-secure-test-password-123!" };
  const keys = await generateRsaKeyPair();
  const csr = await x509.Pkcs10CertificateRequestGenerator.create({ name: `CN=${enrollment.username}`, keys, signingAlgorithm: RSA_SIGNING });
  const response = await request(createEnrollmentApp())
    .post("/Marti/api/tls/signClient/v2?clientUid=TEST-DEVICE")
    .auth(enrollment.username, enrollment.token)
    .set("Content-Type", "text/plain")
    .send(Buffer.from(csr.rawData).toString("base64"))
    .expect(200);
  const body = JSON.parse(response.text) as Record<string, string>;
  const signed = body.signedCert ?? "";
  return {
    certificateDer: Buffer.from(signed, "base64"),
    certificatePem: pemOf(signed),
    privateKeyPem: await exportPrivateKeyPem(keys.privateKey),
    caPems: Object.entries(body)
      .filter(([key]) => key.startsWith("ca"))
      .map(([, value]) => pemOf(value)),
  };
}
