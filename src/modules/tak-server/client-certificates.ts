import { createHash, createPublicKey, randomBytes, randomUUID } from "node:crypto";
import type { TakClientCertificate } from "../../generated/prisma/client.js";
import { database } from "../../shared/database/database.js";
import { activeCertificateAuthority, decryptCaKey, fingerprintOf } from "./certificate-authority.js";
import { signingKeyFromPem, x509 } from "./x509.js";

const DAY = 86_400_000;
const MINIMUM_RSA_BITS = 2048;

export class CertificateRequestError extends Error {}

/** ATAK sends the CSR as bare base64, iTAK and tools may send PEM; both are accepted. */
function parseRequest(body: string): x509.Pkcs10CertificateRequest {
  const trimmed = body.trim();
  const pem = trimmed.includes("BEGIN CERTIFICATE REQUEST")
    ? trimmed
    : `-----BEGIN CERTIFICATE REQUEST-----\n${trimmed}\n-----END CERTIFICATE REQUEST-----`;
  try {
    return new x509.Pkcs10CertificateRequest(pem);
  } catch {
    throw new CertificateRequestError("The certificate request is not readable.");
  }
}

function checkKeyStrength(request: x509.Pkcs10CertificateRequest): void {
  const key = createPublicKey({ key: Buffer.from(request.publicKey.rawData), format: "der", type: "spki" });
  const details = key.asymmetricKeyDetails;
  const strongRsa = key.asymmetricKeyType === "rsa" && (details?.modulusLength ?? 0) >= MINIMUM_RSA_BITS;
  const strongEc = key.asymmetricKeyType === "ec" && ["prime256v1", "secp384r1"].includes(details?.namedCurve ?? "");
  if (!strongRsa && !strongEc) {
    throw new CertificateRequestError("Use an RSA key of at least 2048 bits or a P-256/P-384 EC key.");
  }
}

/**
 * Checks a CSR from a TAK app: readable, self-signed by the key it carries, a strong key, and the
 * common name the enrolling user authenticated with.
 */
export async function validateCertificateRequest(body: string, expectedCommonName: string): Promise<x509.Pkcs10CertificateRequest> {
  const request = parseRequest(body);
  if (!(await request.verify())) {
    throw new CertificateRequestError("The certificate request signature is invalid.");
  }
  checkKeyStrength(request);
  const commonName = request.subjectName.getField("CN")[0];
  if (commonName !== expectedCommonName) {
    throw new CertificateRequestError("The certificate request must use the enrollment user name as common name.");
  }
  return request;
}

/**
 * Signs a client certificate for a user. Only the public key is taken from the request; the
 * subject, usage and lifetime are set by Core so a client cannot ask for more than a client
 * certificate. It never outlives the signing CA.
 */
export async function issueClientCertificate(
  userId: string,
  request: x509.Pkcs10CertificateRequest,
  days: number,
  clientUid: string | null,
): Promise<{ certificate: x509.X509Certificate; row: TakClientCertificate }> {
  const authority = await activeCertificateAuthority();
  const caCertificate = new x509.X509Certificate(authority.certificatePem);
  const { key, algorithm } = signingKeyFromPem(decryptCaKey(authority));
  const notBefore = new Date(Date.now() - 60_000);
  const notAfter = new Date(Math.min(notBefore.getTime() + days * DAY, authority.notAfter.getTime()));
  const serialNumber = `01${randomBytes(15).toString("hex")}`;

  const certificate = await x509.X509CertificateGenerator.create({
    serialNumber,
    subject: `CN=${userId}, O=OpenMeshTak`,
    issuer: caCertificate.subject,
    notBefore,
    notAfter,
    publicKey: request.publicKey,
    signingKey: key,
    signingAlgorithm: algorithm,
    extensions: [
      new x509.BasicConstraintsExtension(false, undefined, true),
      new x509.KeyUsagesExtension(x509.KeyUsageFlags.digitalSignature | x509.KeyUsageFlags.keyEncipherment, true),
      new x509.ExtendedKeyUsageExtension([x509.ExtendedKeyUsage.clientAuth]),
      await x509.AuthorityKeyIdentifierExtension.create(caCertificate),
    ],
  });

  const row = await database.takClientCertificate.create({
    data: {
      id: randomUUID(),
      userId,
      caId: authority.id,
      serialNumber,
      fingerprintSha256: fingerprintOf(certificate),
      commonName: userId,
      clientUid,
      notBefore,
      notAfter,
    },
  });
  return { certificate, row };
}

/** Lowercase hex SHA-256 of a DER certificate, as stored for issued certificates. */
export function fingerprintOfDer(der: Buffer): string {
  return createHash("sha256").update(der).digest("hex");
}
