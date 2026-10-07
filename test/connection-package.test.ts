import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { strFromU8, unzipSync } from "fflate";
import forge from "node-forge";
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

  void it("writes a truststore that Java and ATAK load as trusted certificates", async () => {
    const { bytes } = buildConnectionPackage({
      hostName: "tak.example.org",
      streamingPort: 8089,
      martiPort: 8443,
      caPems: [await selfSignedPem(), await selfSignedPem()],
    });
    const file = unzipSync(bytes)["certs/openmeshtak-truststore.p12"] ?? new Uint8Array();

    // Parsing our own output only; forge checks the MAC with the password from config.pref.
    const store = forge.pkcs12.pkcs12FromAsn1(forge.asn1.fromDer(Buffer.from(file).toString("binary")), "openmeshtak");
    const certBag = "1.2.840.113549.1.12.10.1.3";
    const bags = (store.getBags({ bagType: certBag })[certBag] ?? []).map((bag) => bag.attributes as Record<string, unknown>);
    assert.equal(bags.length, 2);
    // A localKeyID makes Java drop a certificate without a key; the Oracle attribute makes it trusted.
    assert.ok(bags.every((attributes) => attributes.localKeyId === undefined));
    assert.deepEqual(bags.map((attributes) => attributes.friendlyName), [["openmeshtak-ca-1"], ["openmeshtak-ca-2"]]);
    const trustedKeyUsage = Buffer.from(forge.asn1.oidToDer("2.16.840.1.113894.746875.1.1").getBytes(), "binary");
    assert.equal(Buffer.from(file).toString("binary").split(trustedKeyUsage.toString("binary")).length - 1, 2);
  });
});
