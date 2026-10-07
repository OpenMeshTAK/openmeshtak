import { randomUUID } from "node:crypto";
import { strToU8, zipSync } from "fflate";
import forge from "node-forge";

/**
 * The truststore only holds public CA certificates, so its password protects nothing secret.
 * PKCS#12 still requires one; TAK apps read it from the preferences next to the file.
 */
const TRUSTSTORE_PASSWORD = "openmeshtak";
const TRUSTSTORE_PATH = "certs/openmeshtak-truststore.p12";
/**
 * Where ATAK finds the truststore after the import. It moves every .p12 of a package into its own
 * `cert/` directory and resolves `caLocation` against its storage root, so the preference must
 * name that location, not the path inside the zip. Otherwise the connection gets no truststore
 * and certificate enrollment stops before it contacts the server.
 */
const TRUSTSTORE_LOCATION = "cert/openmeshtak-truststore.p12";

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

const OID = {
  data: "1.2.840.113549.1.7.1",
  certBag: "1.2.840.113549.1.12.10.1.3",
  x509Certificate: "1.2.840.113549.1.9.22.1",
  friendlyName: "1.2.840.113549.1.9.20",
  sha1: "1.3.14.3.2.26",
};
/** Oracle's "trusted key usage" bag attribute; Java keeps a key-less certificate only with it. */
const ORACLE_TRUSTED_KEY_USAGE = "2.16.840.1.113894.746875.1.1";
const ANY_EXTENDED_KEY_USAGE = "2.5.29.37.0";
const MAC_ITERATIONS = 2048;

const { asn1 } = forge;

function sequence(...items: forge.asn1.Asn1[]): forge.asn1.Asn1 {
  return asn1.create(asn1.Class.UNIVERSAL, asn1.Type.SEQUENCE, true, items);
}

function set(...items: forge.asn1.Asn1[]): forge.asn1.Asn1 {
  return asn1.create(asn1.Class.UNIVERSAL, asn1.Type.SET, true, items);
}

function oid(value: string): forge.asn1.Asn1 {
  return asn1.create(asn1.Class.UNIVERSAL, asn1.Type.OID, false, asn1.oidToDer(value).getBytes());
}

function octets(bytes: string): forge.asn1.Asn1 {
  return asn1.create(asn1.Class.UNIVERSAL, asn1.Type.OCTETSTRING, false, bytes);
}

function explicit(item: forge.asn1.Asn1): forge.asn1.Asn1 {
  return asn1.create(asn1.Class.CONTEXT_SPECIFIC, 0, true, [item]);
}

/** PKCS#7 `data` ContentInfo around DER content. */
function dataContent(content: forge.asn1.Asn1): forge.asn1.Asn1 {
  return sequence(oid(OID.data), explicit(octets(asn1.toDer(content).getBytes())));
}

function trustedCertificateBag(pem: string, alias: string): forge.asn1.Asn1 {
  const der = asn1.toDer(forge.pki.certificateToAsn1(forge.pki.certificateFromPem(pem))).getBytes();
  const friendlyName = asn1.create(asn1.Class.UNIVERSAL, asn1.Type.BMPSTRING, false, alias);
  return sequence(
    oid(OID.certBag),
    explicit(sequence(oid(OID.x509Certificate), explicit(octets(der)))),
    set(
      sequence(oid(OID.friendlyName), set(friendlyName)),
      sequence(oid(ORACLE_TRUSTED_KEY_USAGE), set(oid(ANY_EXTENDED_KEY_USAGE))),
    ),
  );
}

/**
 * node-forge is used only to WRITE this PKCS#12 file. Its RSA signature verification has an
 * unpatched advisory (GHSA-86w9-cpqp-85rv, ignored in pnpm audit for that reason); never use
 * node-forge to verify signatures or parse untrusted certificates.
 *
 * A PKCS#12 truststore with the CA certificates and no key, laid out like `keytool -importcert`
 * writes it. forge's own builder is not used: it tags certificates with a localKeyID, so Java and
 * ATAK treat them as halves of a missing key pair and load an empty truststore. Each certificate
 * needs its own alias and the Oracle trusted-key-usage attribute instead. The certificates are
 * public, so the bags stay unencrypted; the password only keys the integrity MAC.
 */
function truststore(caPems: string[]): Uint8Array {
  const bags = caPems.map((pem, index) => trustedCertificateBag(pem, `openmeshtak-ca-${String(index + 1)}`));
  const authenticatedSafe = sequence(dataContent(sequence(...bags)));
  const salt = forge.random.getBytesSync(20);
  const macKey = forge.pkcs12.generateKey(TRUSTSTORE_PASSWORD, forge.util.createBuffer(salt), 3, MAC_ITERATIONS, 20);
  const hmac = forge.hmac.create();
  hmac.start("sha1", macKey);
  hmac.update(asn1.toDer(authenticatedSafe).getBytes());
  const pfx = sequence(
    asn1.create(asn1.Class.UNIVERSAL, asn1.Type.INTEGER, false, asn1.integerToDer(3).getBytes()),
    dataContent(authenticatedSafe),
    sequence(
      sequence(sequence(oid(OID.sha1), asn1.create(asn1.Class.UNIVERSAL, asn1.Type.NULL, false, "")), octets(hmac.digest().getBytes())),
      octets(salt),
      asn1.create(asn1.Class.UNIVERSAL, asn1.Type.INTEGER, false, asn1.integerToDer(MAC_ITERATIONS).getBytes()),
    ),
  );
  return Uint8Array.from(Buffer.from(asn1.toDer(pfx).getBytes(), "binary"));
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
    <entry key="caLocation0" class="class java.lang.String">${TRUSTSTORE_LOCATION}</entry>
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
