import { createHash, createPrivateKey, randomBytes, randomUUID, type KeyObject } from "node:crypto";
import type { TakCertificateAuthority } from "../../generated/prisma/client.js";
import { decryptSecret, encryptSecret } from "../../shared/crypto/secret-box.js";
import { database } from "../../shared/database/database.js";
import { isUniqueConstraintError } from "../../shared/database/unique-constraint.js";
import { validationProblem } from "../../shared/errors/problem-error.js";
import {
  exportPrivateKeyPem,
  generateRsaKeyPair,
  keyMatchesCertificate,
  RSA_SIGNING,
  signingAlgorithmFor,
  x509,
} from "./x509.js";

const ACTIVE = "active";
const GENERATED_CA_YEARS = 10;
/** An imported CA must stay valid at least this long, or clients would soon stop trusting it. */
const MINIMUM_REMAINING_DAYS = 30;

export function fingerprintOf(certificate: x509.X509Certificate): string {
  return createHash("sha256").update(Buffer.from(certificate.rawData)).digest("hex");
}

/** The CA ID is bound into the ciphertext so a key envelope cannot be moved to another CA row. */
function encryptCaKey(caId: string, privateKeyPem: string): string {
  return encryptSecret(Buffer.from(privateKeyPem, "utf8"), "tak-ca-key", caId);
}

export function decryptCaKey(authority: Pick<TakCertificateAuthority, "id" | "keyEnvelope">): string {
  return decryptSecret(authority.keyEnvelope, "tak-ca-key", authority.id).toString("utf8");
}

function rowFor(
  id: string,
  origin: "generated" | "imported",
  certificate: x509.X509Certificate,
  privateKeyPem: string,
) {
  return {
    id,
    origin,
    certificatePem: certificate.toString("pem"),
    keyEnvelope: encryptCaKey(id, privateKeyPem),
    fingerprintSha256: fingerprintOf(certificate),
    subject: certificate.subject,
    notBefore: certificate.notBefore,
    notAfter: certificate.notAfter,
  };
}

async function generateAuthority(id: string) {
  const keys = await generateRsaKeyPair();
  const notBefore = new Date(Date.now() - 60_000);
  const notAfter = new Date(notBefore);
  notAfter.setFullYear(notAfter.getFullYear() + GENERATED_CA_YEARS);
  const certificate = await x509.X509CertificateGenerator.createSelfSigned({
    // Random positive serial numbers, as RFC 5280 recommends for unpredictability.
    serialNumber: `01${randomBytes(15).toString("hex")}`,
    name: `CN=OpenMeshTak CA ${id.slice(0, 8)}, O=OpenMeshTak`,
    notBefore,
    notAfter,
    keys,
    signingAlgorithm: RSA_SIGNING,
    extensions: [
      new x509.BasicConstraintsExtension(true, 0, true),
      new x509.KeyUsagesExtension(x509.KeyUsageFlags.keyCertSign | x509.KeyUsageFlags.cRLSign, true),
      await x509.SubjectKeyIdentifierExtension.create(keys.publicKey),
    ],
  });
  return rowFor(id, "generated", certificate, await exportPrivateKeyPem(keys.privateKey));
}

/**
 * The CA that signs new certificates. A fresh installation creates its own on first use; two
 * concurrent first uses cannot both win because the active slot is unique.
 */
export async function activeCertificateAuthority(): Promise<TakCertificateAuthority> {
  const existing = await database.takCertificateAuthority.findUnique({ where: { activeSlot: ACTIVE } });
  if (existing !== null) {
    return existing;
  }
  try {
    return await database.takCertificateAuthority.create({
      data: { ...(await generateAuthority(randomUUID())), activeSlot: ACTIVE },
    });
  } catch (error: unknown) {
    if (!isUniqueConstraintError(error)) {
      throw error;
    }
    return database.takCertificateAuthority.findUniqueOrThrow({ where: { activeSlot: ACTIVE } });
  }
}

/** Every CA clients should still trust: the active one and older ones that have not expired. */
export async function trustedCertificateAuthorities(now = new Date()): Promise<TakCertificateAuthority[]> {
  await activeCertificateAuthority();
  return database.takCertificateAuthority.findMany({
    where: { notAfter: { gt: now } },
    orderBy: [{ activeSlot: "desc" }, { createdAt: "desc" }],
  });
}

function importProblem(field: "certificatePem" | "privateKeyPem", message: string) {
  return validationProblem([{ field, code: "INVALID_CERTIFICATE_AUTHORITY", message }]);
}

function parseCertificate(pem: string): x509.X509Certificate {
  try {
    return new x509.X509Certificate(pem);
  } catch {
    throw importProblem("certificatePem", "Paste one PEM-encoded certificate.");
  }
}

function parsePrivateKey(pem: string): KeyObject {
  try {
    // Without a passphrase, encrypted keys fail here, which is intended: Core cannot unlock them later.
    const key = createPrivateKey(pem);
    signingAlgorithmFor(key);
    return key;
  } catch {
    throw importProblem("privateKeyPem", "Paste an unencrypted RSA or P-256/P-384 EC private key in PEM format.");
  }
}

function checkIsUsableAuthority(certificate: x509.X509Certificate, now: Date): void {
  const constraints = certificate.getExtension(x509.BasicConstraintsExtension);
  if (constraints?.ca !== true) {
    throw importProblem("certificatePem", "The certificate is not a certificate authority.");
  }
  const usages = certificate.getExtension(x509.KeyUsagesExtension);
  if (usages !== null && (usages.usages & x509.KeyUsageFlags.keyCertSign) === 0) {
    throw importProblem("certificatePem", "The certificate may not sign other certificates.");
  }
  const remainingDays = (certificate.notAfter.getTime() - now.getTime()) / 86_400_000;
  if (certificate.notBefore > now || remainingDays < MINIMUM_REMAINING_DAYS) {
    throw importProblem("certificatePem", `The certificate must be valid now and for at least ${String(MINIMUM_REMAINING_DAYS)} more days.`);
  }
}

/**
 * Validates an administrator's CA and makes it the active one. The previous CA stays trusted until
 * it expires, so already enrolled clients keep working.
 */
export async function importCertificateAuthority(
  certificatePem: string,
  privateKeyPem: string,
  now = new Date(),
): Promise<TakCertificateAuthority> {
  const certificate = parseCertificate(certificatePem);
  const key = parsePrivateKey(privateKeyPem);
  checkIsUsableAuthority(certificate, now);
  if (!keyMatchesCertificate(key, certificatePem)) {
    throw importProblem("privateKeyPem", "The private key does not belong to the certificate.");
  }
  const pkcs8 = key.export({ type: "pkcs8", format: "pem" }).toString();
  const row = rowFor(randomUUID(), "imported", certificate, pkcs8);

  try {
    return await database.$transaction(async (transaction) => {
      await transaction.takCertificateAuthority.updateMany({ where: { activeSlot: ACTIVE }, data: { activeSlot: null } });
      return transaction.takCertificateAuthority.create({ data: { ...row, activeSlot: ACTIVE } });
    });
  } catch (error: unknown) {
    if (isUniqueConstraintError(error)) {
      throw importProblem("certificatePem", "This certificate authority is already known.");
    }
    throw error;
  }
}
