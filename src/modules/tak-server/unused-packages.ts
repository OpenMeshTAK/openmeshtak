import { randomUUID } from "node:crypto";
import { database } from "../../shared/database/database.js";
import { logger } from "../../shared/logging/logger.js";
import { revokeCertificate } from "./client-certificates.service.js";
import { PACKAGE_UID_PREFIXES } from "./itak-connection-package.service.js";
import { loadTakServerSettings } from "./tak-server-settings.js";

const HOUR_MS = 3_600_000;

/**
 * A downloaded iTAK or WinTAK package holds a working private key. Users may download as many as
 * they like, so one that no app imported within the configured hours is revoked: a forgotten file
 * in a downloads folder or chat must not stay a valid login for the certificate's whole lifetime.
 */
export async function revokeUnusedPackageCertificates(now = new Date()): Promise<number> {
  const { unusedPackageHours } = await loadTakServerSettings();
  const unused = await database.takClientCertificate.findMany({
    where: {
      OR: PACKAGE_UID_PREFIXES.map((prefix) => ({ clientUid: { startsWith: prefix } })),
      firstConnectedAt: null,
      revokedAt: null,
      createdAt: { lt: new Date(now.getTime() - unusedPackageHours * HOUR_MS) },
    },
  });
  const actor = { principal: { type: "system" } as const, traceId: randomUUID() };
  for (const certificate of unused) {
    await revokeCertificate(actor, certificate, `Package not imported within ${String(unusedPackageHours)} hours`);
  }
  return unused.length;
}

/** Runs the check at start and then every ten minutes in the Core server process. */
export function scheduleUnusedPackageCleanup(): NodeJS.Timeout {
  const run = (): void => {
    revokeUnusedPackageCertificates()
      .then((revoked) => {
        if (revoked > 0) {
          logger.info({ event: "tak_unused_packages_revoked", revoked }, "Unused TAK package certificates revoked");
        }
      })
      .catch((error: unknown) => {
        logger.error({ error, event: "tak_unused_packages_revoke_failed" }, "Unused TAK package certificates could not be revoked");
      });
  };
  run();
  return setInterval(run, 10 * 60_000).unref();
}
