import * as acme from "acme-client";
import type { TakAcmeSettings, TakServerCertificate } from "../../generated/prisma/client.js";
import { database } from "../../shared/database/database.js";
import { logger } from "../../shared/logging/logger.js";
import { createAcmeChallengeSolver, type PresentedAcmeChallenge } from "./acme-challenge.js";
import { ACME_SETTINGS_ID, decryptAcmeAccountKey, encryptAcmeAccountKey } from "./acme-settings.js";
import { addServerCertificate } from "./server-certificate.js";

async function accountKeyFor(settings: TakAcmeSettings): Promise<Buffer> {
  if (settings.accountKeyEnvelope !== null) {
    return decryptAcmeAccountKey(settings.accountKeyEnvelope);
  }
  const key = await acme.crypto.createPrivateKey();
  const updated = await database.takAcmeSettings.updateMany({
    where: { id: ACME_SETTINGS_ID, accountKeyEnvelope: null },
    data: { accountKeyEnvelope: encryptAcmeAccountKey(key) },
  });
  if (updated.count === 1) {
    return key;
  }
  const current = await database.takAcmeSettings.findUniqueOrThrow({ where: { id: ACME_SETTINGS_ID } });
  if (current.accountKeyEnvelope === null) {
    throw new Error("The ACME account key could not be stored.");
  }
  return decryptAcmeAccountKey(current.accountKeyEnvelope);
}

/** Obtains and activates one public certificate; the caller owns retry and status handling. */
export async function issueAcmeCertificate(settings: TakAcmeSettings, hostName: string): Promise<TakServerCertificate> {
  if (settings.email === null) {
    throw new Error("The ACME contact email is missing.");
  }
  const solver = createAcmeChallengeSolver(settings);
  const accountKey = await accountKeyFor(settings);
  const [certificateKey, csr] = await acme.crypto.createCsr({ commonName: hostName, altNames: [hostName] });
  const client = new acme.Client({
    directoryUrl: acme.directory.letsencrypt.production,
    accountKey,
  });
  const presented = new Map<string, PresentedAcmeChallenge>();

  let certificateChainPem: string;
  try {
    certificateChainPem = await client.auto({
      csr,
      email: settings.email,
      termsOfServiceAgreed: true,
      challengePriority: [settings.challengeType],
      challengeCreateFn: async (authorization, challenge, keyAuthorization) => {
        if (authorization.identifier.type !== "dns" || authorization.identifier.value !== hostName) {
          throw new Error("The ACME server requested an unexpected identifier.");
        }
        const handle = await solver.present({
          identifier: authorization.identifier.value,
          challengeType: challenge.type,
          keyAuthorization,
        });
        presented.set(challenge.url, handle);
      },
      challengeRemoveFn: async (_authorization, challenge) => {
        const handle = presented.get(challenge.url);
        if (handle !== undefined) {
          await handle.remove();
          presented.delete(challenge.url);
        }
      },
    });
  } finally {
    // acme-client suppresses cleanup callback failures. Retry leftover handles so a transient API
    // failure does not leave validation records behind without an observable warning.
    const cleanup = await Promise.allSettled([...presented.values()].map((handle) => handle.remove()));
    if (cleanup.some((result) => result.status === "rejected")) {
      logger.warn(
        { event: "tak_acme_challenge_cleanup_failed", hostName, provider: settings.provider },
        "One or more ACME challenge records could not be removed",
      );
    }
  }

  return addServerCertificate(certificateChainPem, certificateKey.toString("utf8"), hostName, { source: "acme" });
}
