import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { strFromU8, unzipSync } from "fflate";
import forge from "node-forge";
import { buildItakConnectionPackage } from "../src/modules/tak-server/itak-connection-package.js";
import { exportPrivateKeyPem, generateRsaKeyPair, RSA_SIGNING, x509 } from "../src/modules/tak-server/x509.js";

async function identity(): Promise<{ certificatePem: string; privateKeyPem: string }> {
  const keys = await generateRsaKeyPair();
  const certificate = await x509.X509CertificateGenerator.createSelfSigned({
    name: "CN=Test iTAK Client",
    keys,
    signingAlgorithm: RSA_SIGNING,
    notBefore: new Date(),
    notAfter: new Date(Date.now() + 86_400_000),
  });
  return { certificatePem: certificate.toString("pem"), privateKeyPem: await exportPrivateKeyPem(keys.privateKey) };
}

void describe("iTAK connection package", () => {
  void it("uses the flat iTAK layout with a client identity and configured Marti port", async () => {
    const client = await identity();
    const { bytes } = buildItakConnectionPackage({
      appName: "iTAK",
      hostName: "tak.example.org",
      streamingPort: 8089,
      martiPort: 8484,
      serverTrustPems: [client.certificatePem],
      clientCertificatePem: client.certificatePem,
      clientPrivateKeyPem: client.privateKeyPem,
      clientCaPems: [],
      password: "test-package-password",
      identity: { callsign: "Jürgen [Bravo]", team: "Dark Blue", role: "Team Lead" },
    });
    const files = unzipSync(bytes);
    assert.deepEqual(Object.keys(files).sort(), ["client.p12", "manifest.xml", "openmeshtak.pref", "truststore.p12"]);

    const manifest = strFromU8(files["manifest.xml"] ?? new Uint8Array());
    assert.match(manifest, /zipEntry="openmeshtak\.pref"/);
    assert.match(manifest, /zipEntry="truststore\.p12"/);
    assert.match(manifest, /zipEntry="client\.p12"/);

    const preferences = strFromU8(files["openmeshtak.pref"] ?? new Uint8Array());
    assert.match(preferences, /tak\.example\.org:8089:ssl/);
    assert.match(preferences, /key="caLocation"[^>]*>cert\/truststore\.p12</);
    assert.match(preferences, /key="certificateLocation"[^>]*>cert\/client\.p12</);
    assert.match(preferences, /key="apiSecureServerPort"[^>]*>8484</);
    assert.doesNotMatch(preferences, /enrollForCertificateWithTrust/);
    assert.match(preferences, /<entry key="locationCallsign" class="class java.lang.String">J&#252;rgen \[Bravo\]<\/entry>/);
    assert.match(preferences, /<entry key="locationTeam" class="class java.lang.String">Dark Blue<\/entry>/);
    assert.match(preferences, /<entry key="atakRoleType" class="class java.lang.String">Team Lead<\/entry>/);
    assert.ok([...preferences].every((character) => character.charCodeAt(0) < 128), "the ASCII file stays ASCII");

    const p12 = forge.pkcs12.pkcs12FromAsn1(
      forge.asn1.fromDer(Buffer.from(files["client.p12"] ?? new Uint8Array()).toString("binary")),
      "test-package-password",
    );
    const keyBag = forge.pki.oids.pkcs8ShroudedKeyBag ?? "";
    const certBag = forge.pki.oids.certBag ?? "";
    assert.equal(p12.getBags({ bagType: keyBag })[keyBag]?.length, 1);
    assert.equal(p12.getBags({ bagType: certBag })[certBag]?.length, 1);

    const trust = forge.pkcs12.pkcs12FromAsn1(
      forge.asn1.fromDer(Buffer.from(files["truststore.p12"] ?? new Uint8Array()).toString("binary")),
      "test-package-password",
    );
    assert.equal(trust.getBags({ bagType: certBag })[certBag]?.length, 1);
    assert.equal(trust.getBags({ bagType: keyBag })[keyBag]?.length ?? 0, 0, "never a server key");
  });
});
