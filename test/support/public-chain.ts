import { exportPrivateKeyPem, generateRsaKeyPair, RSA_SIGNING, x509 } from "../../src/modules/tak-server/x509.js";

type KeyPair = Awaited<ReturnType<typeof generateRsaKeyPair>>;

async function signed(
  subject: string,
  keys: KeyPair,
  issuer: { name: string; key: CryptoKey } | null,
  extensions: x509.Extension[],
): Promise<x509.X509Certificate> {
  return x509.X509CertificateGenerator.create({
    serialNumber: "0b",
    subject,
    issuer: issuer?.name ?? subject,
    notBefore: new Date(Date.now() - 60_000),
    notAfter: new Date(Date.now() + 90 * 86_400_000),
    publicKey: keys.publicKey,
    signingKey: issuer?.key ?? keys.privateKey,
    signingAlgorithm: RSA_SIGNING,
    extensions,
  });
}

/** A root, an intermediate and a leaf for the host, shaped like a Let's Encrypt chain. */
export async function publicChain(hostName: string) {
  const rootKeys = await generateRsaKeyPair();
  const intermediateKeys = await generateRsaKeyPair();
  const leafKeys = await generateRsaKeyPair();
  const ca = [new x509.BasicConstraintsExtension(true, undefined, true)];
  const root = await signed("CN=Test Public Root", rootKeys, null, ca);
  const intermediate = await signed("CN=Test R10", intermediateKeys, { name: root.subject, key: rootKeys.privateKey }, ca);
  const leaf = await signed(`CN=${hostName}`, leafKeys, { name: intermediate.subject, key: intermediateKeys.privateKey }, [
    new x509.SubjectAlternativeNameExtension([{ type: "dns", value: hostName }]),
  ]);
  return {
    rootPem: root.toString("pem"),
    chainPem: leaf.toString("pem") + "\n" + intermediate.toString("pem"),
    keyPem: await exportPrivateKeyPem(leafKeys.privateKey),
  };
}
