import assert from "node:assert/strict";
import { after, afterEach, beforeEach, describe, it } from "node:test";
import type { Express } from "express";
import request from "supertest";
import type { TakServerCertificate } from "../src/generated/prisma/client.js";
import { createApp } from "../src/app.js";
import { setAcmeIssuerForTests } from "../src/modules/tak-server/acme-manager.js";
import { httpChallengeHostProblem } from "../src/modules/tak-server/acme-settings.service.js";
import { HttpChallengeSolver } from "../src/modules/tak-server/http-challenge.js";
import { database, disconnectDatabase } from "../src/shared/database/database.js";
import { clearDatabase, createUser, type TestUser } from "./support/identity.js";

const API_TOKEN = "cloudflare-secret-value";
const ZONE_ID = "0123456789abcdef0123456789abcdef";

let app: Express;
let admin: TestUser;

function serverSettings(version = 0, hostName: string | null = "tak.example.org") {
  return request(app).put("/api/v1/tak-server/settings").set("Cookie", admin.cookie).send({
    version,
    enabled: false,
    hostName,
    enrollmentPort: 8446,
    martiPort: 8443,
    streamingPort: 8089,
    clientCertificateDays: 365,
  });
}

function acmeSettings(version: number, changes: Record<string, unknown> = {}) {
  return request(app)
    .put("/api/v1/tak-server/acme")
    .set("Cookie", admin.cookie)
    .send({
      version,
      enabled: false,
      email: "admin@example.org",
      challengeType: "dns-01",
      provider: "cloudflare",
      cloudflareZoneId: ZONE_ID,
      ...changes,
    });
}

void describe("TAK ACME settings", () => {
  beforeEach(async () => {
    await clearDatabase();
    app = createApp();
    admin = await createUser("Admin", [{ permission: "tak-server.manage" }]);
    await serverSettings().expect(200);
  });

  afterEach(() => {
    setAcmeIssuerForTests(null);
  });

  after(async () => {
    await clearDatabase();
    await disconnectDatabase();
  });

  void it("stores the provider token encrypted and returns only its presence", async () => {
    const saved = await acmeSettings(0, { apiToken: API_TOKEN }).expect(200);
    assert.equal((saved.body as { apiTokenSet: boolean }).apiTokenSet, true);
    assert.equal(JSON.stringify(saved.body).includes(API_TOKEN), false);

    const row = await database.takAcmeSettings.findUniqueOrThrow({ where: { id: "tak-acme" } });
    assert.equal(JSON.stringify(row).includes(API_TOKEN), false);
    assert.equal(JSON.stringify(await database.auditEvent.findMany()).includes(API_TOKEN), false);

    const kept = await acmeSettings(1, { email: "renewals@example.org" }).expect(200);
    assert.equal((kept.body as { apiTokenSet: boolean }).apiTokenSet, true);
    const cleared = await acmeSettings(2, { apiToken: null }).expect(200);
    assert.equal((cleared.body as { apiTokenSet: boolean }).apiTokenSet, false);
  });

  void it("rejects solvers not shipped by this Core version and DNS-01 for an IP address", async () => {
    await acmeSettings(0, { challengeType: "dns-01", provider: "route53", apiToken: API_TOKEN }).expect(422);
    await serverSettings(1, "192.0.2.10").expect(200);
    const response = await acmeSettings(0, { enabled: true, apiToken: API_TOKEN }).expect(422);
    assert.match(JSON.stringify(response.body), /DNS_HOST_REQUIRED/);
  });

  void it("renews through the selected solver boundary and persists status", async () => {
    let issued = 0;
    setAcmeIssuerForTests((_settings, hostName) => {
      issued += 1;
      const now = new Date();
      return Promise.resolve({
        id: "test-certificate",
        source: "acme",
        hostName,
        caId: null,
        certificateChainPem: "test chain",
        keyEnvelope: "test key",
        fingerprintSha256: "00",
        subject: `CN=${hostName}`,
        notAfter: new Date(now.getTime() + 90 * 86_400_000),
        activeSlot: "active",
        createdAt: now,
      } satisfies TakServerCertificate);
    });

    await acmeSettings(0, { enabled: true, apiToken: API_TOKEN }).expect(200);
    const renewed = await request(app).post("/api/v1/tak-server/acme/renew").set("Cookie", admin.cookie).expect(200);
    assert.ok(issued >= 1, "saving or the explicit renewal invokes the configured issuer");
    assert.equal((renewed.body as { lastError: string | null }).lastError, null);
    assert.ok((renewed.body as { lastSuccessAt: string | null }).lastSuccessAt);
  });

  void it("allows HTTP-01 only when the TAK host is the Web host", async () => {
    const mismatch = await acmeSettings(0, { challengeType: "http-01", provider: "web-address", cloudflareZoneId: null, enabled: true }).expect(422);
    assert.match(JSON.stringify(mismatch.body), /HTTP_CHALLENGE_HOST_MISMATCH/);

    // The comparison itself; test Cores run on localhost, which the TAK settings refuse as host name.
    assert.equal(httpChallengeHostProblem("TAK.example.org", "https://tak.example.org"), null);
    assert.equal(httpChallengeHostProblem("tak.example.org", "https://web.example.org")?.code, "HTTP_CHALLENGE_HOST_MISMATCH");
  });

  void it("serves a pending HTTP-01 key authorization until the challenge is removed", async () => {
    const presented = await new HttpChallengeSolver().present({
      identifier: "localhost",
      challengeType: "http-01",
      keyAuthorization: "token-123.thumbprint",
    });
    const served = await request(app).get("/.well-known/acme-challenge/token-123").expect(200);
    assert.equal(served.text, "token-123.thumbprint");

    await presented.remove();
    await request(app).get("/.well-known/acme-challenge/token-123").expect(404);
    await request(app).get("/.well-known/acme-challenge/unknown").expect(404);
  });

  void it("requires tak-server.manage", async () => {
    const other = await createUser("Editor", [{ permission: "events.manage" }]);
    await request(app).get("/api/v1/tak-server/acme").set("Cookie", other.cookie).expect(403);
  });
});
