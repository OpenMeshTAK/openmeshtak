import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { after, afterEach, beforeEach, describe, it } from "node:test";
import request from "supertest";
import { createApp } from "../src/app.js";
import { setAcmeIssuerForTests } from "../src/modules/tak-server/acme-manager.js";
import { reloadCertificateFiles, useCertificateFiles } from "../src/modules/tak-server/certificate-files.js";
import { activeServerCertificate } from "../src/modules/tak-server/server-certificate.js";
import { ProblemError } from "../src/shared/errors/problem-error.js";
import { database, disconnectDatabase } from "../src/shared/database/database.js";
import { clearDatabase, createUser } from "./support/identity.js";
import { publicChain } from "./support/public-chain.js";

const HOST = "tak.example.org";
const files = { certificateFile: `live/${HOST}/fullchain.pem`, keyFile: `live/${HOST}/privkey.pem` };
let directory: string;

async function writeChain(): Promise<{ rootPem: string }> {
  const chain = await publicChain(HOST);
  mkdirSync(path.join(directory, "live", HOST), { recursive: true });
  writeFileSync(path.join(directory, files.certificateFile), chain.chainPem);
  writeFileSync(path.join(directory, files.keyFile), chain.keyPem);
  return chain;
}

function fieldOf(error: unknown): string | undefined {
  return error instanceof ProblemError ? error.errors?.[0]?.field : undefined;
}

void describe("TAK certificate files of the reverse proxy", () => {
  beforeEach(async () => {
    await clearDatabase();
    await database.takServerSettings.create({ data: { id: "tak-server", hostName: HOST } });
    directory = mkdtempSync(path.join(tmpdir(), "openmeshtak-certs-"));
  });

  afterEach(() => {
    setAcmeIssuerForTests(null);
    rmSync(directory, { recursive: true, force: true });
  });

  after(async () => {
    await clearDatabase();
    await disconnectDatabase();
  });

  void it("uses the files and picks up a certificate the proxy renewed", async () => {
    const first = await writeChain();
    const used = await useCertificateFiles(HOST, files, { directory, trustedRoots: [first.rootPem] });
    assert.equal(used.source, "file");
    const settings = await database.takServerSettings.findUniqueOrThrow({ where: { id: "tak-server" } });
    assert.deepEqual([settings.certificateFile, settings.certificateKeyFile], [files.certificateFile, files.keyFile]);

    assert.equal(await reloadCertificateFiles({ directory, trustedRoots: [first.rootPem] }), null, "unchanged files are not reloaded");

    const renewed = await writeChain();
    const reloaded = await reloadCertificateFiles({ directory, trustedRoots: [renewed.rootPem] });
    assert.ok(reloaded !== null);
    assert.equal((await activeServerCertificate())?.id, reloaded.id);
  });

  void it("reads only below the mounted directory", async () => {
    await writeChain();
    writeFileSync(path.join(path.dirname(directory), "outside.pem"), "not a certificate");
    for (const certificateFile of ["/etc/passwd", "../outside.pem", "live/missing.pem", ""]) {
      await assert.rejects(useCertificateFiles(HOST, { ...files, certificateFile }, { directory }), (error) => fieldOf(error) === "certificateFile");
    }
    await assert.rejects(useCertificateFiles(HOST, { ...files, keyFile: "../outside.pem" }, { directory }), (error) => fieldOf(error) === "keyFile");
    rmSync(path.join(path.dirname(directory), "outside.pem"), { force: true });
  });

  void it("names the files next to a path that was not found", async () => {
    await writeChain();
    await assert.rejects(
      useCertificateFiles(HOST, { ...files, certificateFile: `live/${HOST}/fullchain.crt` }, { directory }),
      (error) => error instanceof ProblemError && error.errors?.[0]?.message.includes(`live/${HOST}/fullchain.pem, live/${HOST}/privkey.pem`) === true,
    );
    await assert.rejects(
      useCertificateFiles(HOST, { ...files, certificateFile: "live/tak.example.com/fullchain.pem" }, { directory }),
      (error) => error instanceof ProblemError && error.errors?.[0]?.message.includes(`live/${HOST}/`) === true,
    );
  });

  void it("reports certificate problems on the file fields", async () => {
    const chain = await writeChain();
    await assert.rejects(
      useCertificateFiles("other.example.org", files, { directory, trustedRoots: [chain.rootPem] }),
      (error) => fieldOf(error) === "certificateFile",
    );
  });

  void it("stops reading the files when Let's Encrypt is switched on", async () => {
    const admin = await createUser("Admin", [{ permission: "tak-server.manage" }]);
    const chain = await writeChain();
    await useCertificateFiles(HOST, files, { directory, trustedRoots: [chain.rootPem] });
    setAcmeIssuerForTests(() => Promise.reject(new Error("not issued in this test")));

    await request(createApp())
      .put("/api/v1/tak-server/acme")
      .set("Cookie", admin.cookie)
      .send({ version: 0, enabled: true, email: "admin@example.org", challengeType: "dns-01", provider: "cloudflare", cloudflareZoneId: "0123456789abcdef0123456789abcdef", apiToken: "token" })
      .expect(200);
    const settings = await database.takServerSettings.findUniqueOrThrow({ where: { id: "tak-server" } });
    assert.equal(settings.certificateFile, null);
  });

  void it("refuses paths outside the mounted directory through the API", async () => {
    const admin = await createUser("Admin", [{ permission: "tak-server.manage" }]);
    const response = await request(createApp())
      .put("/api/v1/tak-server/server-certificate/files")
      .set("Cookie", admin.cookie)
      .send({ certificateFile: "../../etc/passwd", keyFile: "privkey.pem" })
      .expect(422);
    assert.match(JSON.stringify(response.body), /certificateFile/);
  });
});
