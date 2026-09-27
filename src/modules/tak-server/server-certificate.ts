import { createPrivateKey, randomBytes, randomUUID, X509Certificate, type KeyObject } from "node:crypto";
import { rootCertificates } from "node:tls";
import type { TakServerCertificate } from "../../generated/prisma/client.js";
import { decryptSecret, encryptSecret } from "../../shared/crypto/secret-box.js";
import { database } from "../../shared/database/database.js";
import { validationProblem } from "../../shared/errors/problem-error.js";
import { activeCertificateAuthority, decryptCaKey, fingerprintOf } from "./certificate-authority.js";
import { exportPrivateKeyPem, generateRsaKeyPair, keyMatchesCertificate, signingAlgorithmFor, signingKeyFromPem, x509 } from "./x509.js";

const ACTIVE = "active";
const ISSUED_SERVER_DAYS = 397;
/** Issued certificates are renewed this long before they expire. */
const RENEW_BEFORE_DAYS = 30;
/** An added certificate must still be valid at least this long. */
const MINIMUM_REMAINING_DAYS = 7;
const DAY = 86_400_000;

interface AddOptions {
  now: Date;
  /** Public roots devices trust; Node's bundled Mozilla store unless a test supplies its own. */
  trustedRoots: readonly string[];
  /** `added` for administrator uploads or `acme` for a certificate obtained by Core. */
  source?: "added" | "acme";
}

function encryptServerKey(id: string, privateKeyPem: string): string {
  return encryptSecret(Buffer.from(privateKeyPem, "utf8"), "tak-server-key", id);
}

export function decryptServerKey(certificate: Pick<TakServerCertificate, "id" | "keyEnvelope">): string {
  return decryptSecret(certificate.keyEnvelope, "tak-server-key", certificate.id).toString("utf8");
}

function certificateProblem(field: "certificateChainPem" | "privateKeyPem", message: string) {
  return validationProblem([{ field, code: "INVALID_SERVER_CERTIFICATE", message }]);
}

/** Splits a PEM bundle into certificates, leaf first, as Let's Encrypt's fullchain.pem has them. */
function parseChain(pem: string): X509Certificate[] {
  const blocks = pem.match(/-----BEGIN CERTIFICATE-----[\s\S]+?-----END CERTIFICATE-----/g) ?? [];
  try {
    return blocks.map((block) => new X509Certificate(block));
  } catch {
    throw certificateProblem("certificateChainPem", "The certificate chain contains an unreadable certificate.");
  }
}

/**
 * Follows the chain from the leaf to a root in Node's bundled public trust store, checking each
 * signature. A certificate devices would not trust out of the box is rejected, because then the
 * OpenMeshTak CA would serve clients better.
 */
function chainsToPublicRoot(chain: X509Certificate[], now: Date, trustedRoots: readonly string[]): boolean {
  const roots = trustedRoots.map((pem) => new X509Certificate(pem));
  let current = chain[0];
  for (let depth = 0; current !== undefined && depth < 6; depth += 1) {
    if (new Date(current.validFrom) > now || new Date(current.validTo) < now) {
      return false;
    }
    const issuer = current;
    const root = roots.find((candidate) => issuer.checkIssued(candidate) && issuer.verify(candidate.publicKey));
    if (root !== undefined) {
      return true;
    }
    current = chain.find((candidate) => issuer.checkIssued(candidate) && issuer.verify(candidate.publicKey) && candidate !== issuer);
  }
  return false;
}

function parseKey(pem: string): KeyObject {
  try {
    const key = createPrivateKey(pem);
    signingAlgorithmFor(key);
    return key;
  } catch {
    throw certificateProblem("privateKeyPem", "Paste an unencrypted RSA or P-256/P-384 EC private key in PEM format.");
  }
}

/** Checks an added certificate such as Let's Encrypt's fullchain.pem and privkey.pem. */
function checkAddedCertificate(chainPem: string, privateKeyPem: string, hostName: string, options: AddOptions) {
  const { now } = options;
  const chain = parseChain(chainPem);
  const leaf = chain[0];
  if (leaf === undefined) {
    throw certificateProblem("certificateChainPem", "Paste the full certificate chain in PEM format, server certificate first.");
  }
  const key = parseKey(privateKeyPem);
  if (!keyMatchesCertificate(key, leaf.toString())) {
    throw certificateProblem("privateKeyPem", "The private key does not belong to the server certificate.");
  }
  if (leaf.checkHost(hostName) === undefined) {
    throw certificateProblem("certificateChainPem", `The certificate is not valid for ${hostName}.`);
  }
  if ((new Date(leaf.validTo).getTime() - now.getTime()) / DAY < MINIMUM_REMAINING_DAYS) {
    throw certificateProblem("certificateChainPem", `The certificate expires in less than ${String(MINIMUM_REMAINING_DAYS)} days.`);
  }
  if (!chainsToPublicRoot(chain, now, options.trustedRoots)) {
    throw certificateProblem("certificateChainPem", "The chain does not lead to a publicly trusted root. Include the intermediate certificates.");
  }
  return { chain, leaf, keyPem: key.export({ type: "pkcs8", format: "pem" }).toString() };
}

function summaryOf(leaf: X509Certificate) {
  return {
    fingerprintSha256: leaf.fingerprint256.replaceAll(":", "").toLowerCase(),
    subject: leaf.subject.replaceAll("\n", ", "),
    notAfter: new Date(leaf.validTo),
  };
}

/** Replaces the active server certificate, keeping only one active row. */
async function activate(data: Omit<TakServerCertificate, "activeSlot" | "createdAt">): Promise<TakServerCertificate> {
  return database.$transaction(async (transaction) => {
    await transaction.takServerCertificate.updateMany({ where: { activeSlot: ACTIVE }, data: { activeSlot: null } });
    return transaction.takServerCertificate.create({ data: { ...data, activeSlot: ACTIVE } });
  });
}

/** Stores an administrator's publicly trusted certificate, e.g. from Let's Encrypt, as the active one. */
export async function addServerCertificate(
  chainPem: string,
  privateKeyPem: string,
  hostName: string,
  options: Partial<AddOptions> = {},
): Promise<TakServerCertificate> {
  const { chain, leaf, keyPem } = checkAddedCertificate(chainPem, privateKeyPem, hostName, {
    now: options.now ?? new Date(),
    trustedRoots: options.trustedRoots ?? rootCertificates,
  });
  const id = randomUUID();
  return activate({
    id,
    source: options.source ?? "added",
    hostName,
    caId: null,
    certificateChainPem: chain.map((certificate) => certificate.toString()).join(""),
    keyEnvelope: encryptServerKey(id, keyPem),
    ...summaryOf(leaf),
  });
}

async function issueServerCertificate(hostName: string): Promise<TakServerCertificate> {
  const authority = await activeCertificateAuthority();
  const caCertificate = new x509.X509Certificate(authority.certificatePem);
  const { key: caKey, algorithm } = signingKeyFromPem(decryptCaKey(authority));
  const keys = await generateRsaKeyPair();
  const notBefore = new Date(Date.now() - 60_000);
  const certificate = await x509.X509CertificateGenerator.create({
    serialNumber: `01${randomBytes(15).toString("hex")}`,
    subject: `CN=${hostName}, O=OpenMeshTak`,
    issuer: caCertificate.subject,
    notBefore,
    notAfter: new Date(notBefore.getTime() + ISSUED_SERVER_DAYS * DAY),
    publicKey: keys.publicKey,
    signingKey: caKey,
    signingAlgorithm: algorithm,
    extensions: [
      new x509.BasicConstraintsExtension(false, undefined, true),
      new x509.KeyUsagesExtension(x509.KeyUsageFlags.digitalSignature | x509.KeyUsageFlags.keyEncipherment, true),
      new x509.ExtendedKeyUsageExtension([x509.ExtendedKeyUsage.serverAuth]),
      new x509.SubjectAlternativeNameExtension([{ type: isIpAddress(hostName) ? "ip" : "dns", value: hostName }]),
      await x509.AuthorityKeyIdentifierExtension.create(caCertificate),
    ],
  });
  const leaf = new X509Certificate(certificate.toString("pem"));
  const id = randomUUID();
  return activate({
    id,
    source: "issued",
    hostName,
    caId: authority.id,
    certificateChainPem: certificate.toString("pem") + "\n" + authority.certificatePem,
    keyEnvelope: encryptServerKey(id, await exportPrivateKeyPem(keys.privateKey)),
    fingerprintSha256: fingerprintOf(certificate),
    subject: summaryOf(leaf).subject,
    notAfter: certificate.notAfter,
  });
}

function isIpAddress(hostName: string): boolean {
  return /^\d{1,3}(?:\.\d{1,3}){3}$/.test(hostName) || hostName.includes(":");
}

/** Whether an issued certificate still fits the host name and the active CA. */
function issuedStillValid(certificate: TakServerCertificate, hostName: string, caId: string, now: Date): boolean {
  return (
    certificate.hostName === hostName &&
    certificate.caId === caId &&
    certificate.notAfter.getTime() - now.getTime() > RENEW_BEFORE_DAYS * DAY
  );
}

/**
 * The certificate the TAK listeners present. An added certificate is used as long as it covers the
 * host name; otherwise Core issues one from the active CA and renews it when needed.
 */
export async function currentServerCertificate(hostName: string, now = new Date()): Promise<TakServerCertificate> {
  const active = await database.takServerCertificate.findUnique({ where: { activeSlot: ACTIVE } });
  if ((active?.source === "added" || active?.source === "acme") && active.hostName === hostName && active.notAfter > now) {
    return active;
  }
  const authority = await activeCertificateAuthority();
  if (active?.source === "issued" && issuedStillValid(active, hostName, authority.id, now)) {
    return active;
  }
  return issueServerCertificate(hostName);
}

/** The active certificate without issuing one, for status displays. */
export function activeServerCertificate(): Promise<TakServerCertificate | null> {
  return database.takServerCertificate.findUnique({ where: { activeSlot: ACTIVE } });
}

/** Drops an added certificate so the next start issues one from the OpenMeshTak CA again. */
export async function removeAddedServerCertificate(): Promise<void> {
  await database.takServerCertificate.updateMany({
    where: { activeSlot: ACTIVE, source: "added" },
    data: { activeSlot: null },
  });
}
