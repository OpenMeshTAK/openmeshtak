// The x509 library resolves its services through tsyringe, which needs the Reflect metadata
// polyfill before it loads. Keeping both imports here confines that quirk to this module.
import "reflect-metadata";
import { createPrivateKey, createPublicKey, webcrypto, type KeyObject } from "node:crypto";
import * as x509 from "@peculiar/x509";

x509.cryptoProvider.set(webcrypto as unknown as Crypto);

export { x509 };

/**
 * RSA-2048 with SHA-256 is what TAK Server itself uses by default, so every ATAK and iTAK version
 * accepts certificates signed this way.
 */
export const RSA_SIGNING = {
  name: "RSASSA-PKCS1-v1_5",
  hash: "SHA-256",
  publicExponent: new Uint8Array([1, 0, 1]),
  modulusLength: 2048,
} as const;

export function generateRsaKeyPair(): Promise<CryptoKeyPair> {
  return webcrypto.subtle.generateKey(RSA_SIGNING, true, ["sign", "verify"]) as Promise<CryptoKeyPair>;
}

export async function exportPrivateKeyPem(key: CryptoKey): Promise<string> {
  const der = await webcrypto.subtle.exportKey("pkcs8", key);
  return x509.PemConverter.encode(der, "PRIVATE KEY");
}

/** Signing algorithm matching a private key; RSA and P-256/P-384 EC keys are supported. */
export function signingAlgorithmFor(key: KeyObject): RsaHashedImportParams | EcKeyImportParams & { hash: string } {
  if (key.asymmetricKeyType === "rsa") {
    return { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" };
  }
  const curve = key.asymmetricKeyDetails?.namedCurve;
  if (key.asymmetricKeyType === "ec" && (curve === "prime256v1" || curve === "secp384r1")) {
    return { name: "ECDSA", namedCurve: curve === "prime256v1" ? "P-256" : "P-384", hash: curve === "prime256v1" ? "SHA-256" : "SHA-384" };
  }
  throw new Error("unsupported key type");
}

/** Loads a stored PKCS#8 key as a WebCrypto signing key. */
export function signingKeyFromPem(pem: string): { key: CryptoKey; algorithm: ReturnType<typeof signingAlgorithmFor> } {
  const keyObject = createPrivateKey(pem);
  const algorithm = signingAlgorithmFor(keyObject);
  return { key: keyObject.toCryptoKey(algorithm, false, ["sign"]) as unknown as CryptoKey, algorithm };
}

/** Whether a private key belongs to a certificate, compared by their public keys. */
export function keyMatchesCertificate(privateKey: KeyObject, certificatePem: string): boolean {
  const fromKey = createPublicKey(privateKey).export({ type: "spki", format: "der" });
  const fromCertificate = createPublicKey(certificatePem).export({ type: "spki", format: "der" });
  return fromKey.equals(fromCertificate);
}
