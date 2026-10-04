import { randomUUID } from "node:crypto";
import { strToU8, zipSync } from "fflate";
import forge from "node-forge";

/**
 * The truststore only holds public CA certificates, so its password protects nothing secret.
 * PKCS#12 still requires one; TAK apps read it from the preferences next to the file.
 */
const TRUSTSTORE_PASSWORD = "openmeshtak";
const TRUSTSTORE_PATH = "certs/openmeshtak-truststore.p12";

export interface ConnectionPackageInput {
  hostName: string;
  streamingPort: number;
  /** Public Marti port; ATAK reads it from the app-wide `apiSecureServerPort` preference. */
  martiPort: number;
  /** CA certificates the app must trust: the OpenMeshTak CAs, or the public chain's root. */
  caPems: string[];
}

function escapeXml(value: string): string {
  return value.replace(/[<>&"']/g, (character) => `&#${String(character.charCodeAt(0))};`);
}

/**
 * node-forge is used only to WRITE this PKCS#12 file. Its RSA signature verification has an
 * unpatched advisory (GHSA-86w9-cpqp-85rv, ignored in pnpm audit for that reason); never use
 * node-forge to verify signatures or parse untrusted certificates.
 *
 * A PKCS#12 truststore with the CA certificates and no key. Triple-DES is the legacy PKCS#12
 * encryption that every ATAK version reads; it protects nothing secret here.
 */
function truststore(caPems: string[]): Uint8Array {
  const certificates = caPems.map((pem) => forge.pki.certificateFromPem(pem));
  const asn1 = forge.pkcs12.toPkcs12Asn1(null, certificates, TRUSTSTORE_PASSWORD, { algorithm: "3des", friendlyName: "OpenMeshTak CA" });
  return Uint8Array.from(Buffer.from(forge.asn1.toDer(asn1).getBytes(), "binary"));
}

/**
 * Server connection preferences in the format of TAK Server enrollment packages: the app trusts
 * the CA from the truststore, connects to the streaming port over TLS and enrolls for a client
 * certificate with user name and password, which the participant takes from the enrollment
 * dialog. No client key or account password is part of the package.
 */
function preferences(input: ConnectionPackageInput): string {
  const description = escapeXml(`OpenMeshTak ${input.hostName}`);
  const connectString = escapeXml(`${input.hostName}:${String(input.streamingPort)}:ssl`);
  return `<?xml version="1.0" standalone="yes"?>
<preferences>
  <preference version="1" name="cot_streams">
    <entry key="count" class="class java.lang.Integer">1</entry>
    <entry key="description0" class="class java.lang.String">${description}</entry>
    <entry key="enabled0" class="class java.lang.Boolean">true</entry>
    <entry key="connectString0" class="class java.lang.String">${connectString}</entry>
    <entry key="caLocation0" class="class java.lang.String">${TRUSTSTORE_PATH}</entry>
    <entry key="caPassword0" class="class java.lang.String">${TRUSTSTORE_PASSWORD}</entry>
    <entry key="enrollForCertificateWithTrust0" class="class java.lang.Boolean">true</entry>
    <entry key="useAuth0" class="class java.lang.Boolean">true</entry>
    <entry key="cacheCreds0" class="class java.lang.String">Cache credentials</entry>
  </preference>
  <preference version="1" name="com.atakmap.app_preferences">
    <entry key="displayServerConnectionWidget" class="class java.lang.Boolean">true</entry>
    <entry key="apiSecureServerPort" class="class java.lang.String">${String(input.martiPort)}</entry>
  </preference>
</preferences>
`;
}

function manifest(name: string): string {
  return `<MissionPackageManifest version="2">
  <Configuration>
    <Parameter name="uid" value="${randomUUID()}"/>
    <Parameter name="name" value="${escapeXml(name)}"/>
    <Parameter name="onReceiveDelete" value="true"/>
  </Configuration>
  <Contents>
    <Content ignore="false" zipEntry="config.pref"/>
    <Content ignore="false" zipEntry="${TRUSTSTORE_PATH}"/>
  </Contents>
</MissionPackageManifest>
`;
}

export function buildConnectionPackage(input: ConnectionPackageInput): { fileName: string; bytes: Uint8Array } {
  const name = `OpenMeshTak ${input.hostName}`;
  const bytes = zipSync(
    {
      "MANIFEST/manifest.xml": strToU8(manifest(name)),
      "config.pref": strToU8(preferences(input)),
      [TRUSTSTORE_PATH]: truststore(input.caPems),
    },
    { level: 6 },
  );
  return { fileName: `OpenMeshTak-${input.hostName.replace(/[^a-z0-9.-]/gi, "_")}.zip`, bytes };
}
