import { randomUUID } from "node:crypto";
import { strToU8, zipSync } from "fflate";
import forge from "node-forge";

const PREF_FILE = "openmeshtak.pref";
const TRUSTSTORE_FILE = "truststore.p12";
const CLIENT_FILE = "client.p12";

export interface ItakConnectionPackageInput {
  hostName: string;
  streamingPort: number;
  martiPort: number;
  serverTrustPems: string[];
  clientCertificatePem: string;
  clientPrivateKeyPem: string;
  clientCaPems: string[];
  password: string;
}

function escapeXml(value: string): string {
  return value.replace(/[<>&"']/g, (character) => `&#${String(character.charCodeAt(0))};`);
}

function toBytes(p12: forge.asn1.Asn1): Uint8Array {
  return Uint8Array.from(Buffer.from(forge.asn1.toDer(p12).getBytes(), "binary"));
}

/** PKCS#12 identity iTAK imports as the TLS client certificate. */
function clientIdentity(input: ItakConnectionPackageInput): Uint8Array {
  const key = forge.pki.privateKeyFromPem(input.clientPrivateKeyPem);
  const certificates = [input.clientCertificatePem, ...input.clientCaPems].map((pem) => forge.pki.certificateFromPem(pem));
  return toBytes(
    forge.pkcs12.toPkcs12Asn1(key, certificates, input.password, {
      algorithm: "3des",
      friendlyName: "OpenMeshTak iTAK",
      generateLocalKeyId: true,
    }),
  );
}

/**
 * Server trust for iTAK. Meshtastic Apple's example ships the server's own identity here, private
 * key included; OpenMeshTak never hands out a server key, so this holds only the 3DES-encrypted
 * certificate bags in the same legacy PKCS#12 shape, not ATAK's Java truststore attributes.
 */
function truststore(input: ItakConnectionPackageInput): Uint8Array {
  const certificates = input.serverTrustPems.map((pem) => forge.pki.certificateFromPem(pem));
  return toBytes(forge.pkcs12.toPkcs12Asn1(null, certificates, input.password, { algorithm: "3des" }));
}

function preferences(input: ItakConnectionPackageInput): string {
  const description = escapeXml(`OpenMeshTak ${input.hostName}`);
  const connectString = escapeXml(`${input.hostName}:${String(input.streamingPort)}:ssl`);
  const password = escapeXml(input.password);
  return `<?xml version="1.0" encoding="ASCII" standalone="yes"?>
<preferences>
  <preference version="1" name="cot_streams">
    <entry key="count" class="class java.lang.Integer">1</entry>
    <entry key="description0" class="class java.lang.String">${description}</entry>
    <entry key="enabled0" class="class java.lang.Boolean">true</entry>
    <entry key="connectString0" class="class java.lang.String">${connectString}</entry>
  </preference>
  <preference version="1" name="com.atakmap.app_preferences">
    <entry key="displayServerConnectionWidget" class="class java.lang.Boolean">true</entry>
    <entry key="caLocation" class="class java.lang.String">cert/${TRUSTSTORE_FILE}</entry>
    <entry key="caPassword" class="class java.lang.String">${password}</entry>
    <entry key="certificateLocation" class="class java.lang.String">cert/${CLIENT_FILE}</entry>
    <entry key="clientPassword" class="class java.lang.String">${password}</entry>
    <entry key="apiSecureServerPort" class="class java.lang.String">${String(input.martiPort)}</entry>
  </preference>
</preferences>
`;
}

function manifest(hostName: string): string {
  return `<MissionPackageManifest version="2">
  <Configuration>
    <Parameter name="uid" value="${randomUUID()}"/>
    <Parameter name="name" value="${escapeXml(`OpenMeshTak iTAK ${hostName}`)}"/>
    <Parameter name="onReceiveDelete" value="true"/>
  </Configuration>
  <Contents>
    <Content ignore="false" zipEntry="${PREF_FILE}"/>
    <Content ignore="false" zipEntry="${TRUSTSTORE_FILE}"/>
    <Content ignore="false" zipEntry="${CLIENT_FILE}"/>
  </Contents>
</MissionPackageManifest>
`;
}

/** Flat package layout used by iTAK and Meshtastic Apple, with no server private key. */
export function buildItakConnectionPackage(input: ItakConnectionPackageInput): { fileName: string; bytes: Uint8Array } {
  const bytes = zipSync(
    {
      "manifest.xml": strToU8(manifest(input.hostName)),
      [PREF_FILE]: strToU8(preferences(input)),
      [TRUSTSTORE_FILE]: truststore(input),
      [CLIENT_FILE]: clientIdentity(input),
    },
    { level: 6 },
  );
  return {
    fileName: `OpenMeshTak-iTAK-${input.hostName.replace(/[^a-z0-9.-]/gi, "_")}.zip`,
    bytes,
  };
}
