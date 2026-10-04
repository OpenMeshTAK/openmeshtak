import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { strFromU8, unzipSync } from "fflate";
import { buildConnectionPackage } from "../src/modules/tak-server/connection-package.js";
import { generateRsaKeyPair, RSA_SIGNING, x509 } from "../src/modules/tak-server/x509.js";

async function selfSignedPem(): Promise<string> {
  const keys = await generateRsaKeyPair();
  const certificate = await x509.X509CertificateGenerator.createSelfSigned({
    name: "CN=Test CA",
    keys,
    signingAlgorithm: RSA_SIGNING,
    notBefore: new Date(),
    notAfter: new Date(Date.now() + 86_400_000),
  });
  return certificate.toString("pem");
}

void describe("TAK connection package", () => {
  void it("points the app at the public streaming and Marti ports", async () => {
    const { bytes } = buildConnectionPackage({ hostName: "tak.example.org", streamingPort: 8089, martiPort: 8484, caPems: [await selfSignedPem()] });

    const preferences = strFromU8(unzipSync(bytes)["config.pref"] ?? new Uint8Array());
    assert.match(preferences, /<entry key="connectString0" class="class java.lang.String">tak.example.org:8089:ssl<\/entry>/);
    assert.match(preferences, /<entry key="apiSecureServerPort" class="class java.lang.String">8484<\/entry>/);
  });
});
