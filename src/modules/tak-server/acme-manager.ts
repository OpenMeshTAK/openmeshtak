import type { TakAcmeSettings, TakServerCertificate } from "../../generated/prisma/client.js";
import { database } from "../../shared/database/database.js";
import { sanitizeLogMessage } from "../../shared/logging/sanitize.js";
import { logger } from "../../shared/logging/logger.js";
import { issueAcmeCertificate } from "./acme-certificate.js";
import { ACME_SETTINGS_ID, loadTakAcmeSettings } from "./acme-settings.js";
import { activeServerCertificate } from "./server-certificate.js";
import { takListeners } from "./tak-listeners.js";
import { loadTakServerSettings } from "./tak-server-settings.js";

const CHECK_INTERVAL_MS = 12 * 60 * 60 * 1000;
const RENEW_BEFORE_MS = 30 * 86_400_000;

type AcmeIssuer = (settings: TakAcmeSettings, hostName: string) => Promise<TakServerCertificate>;

let issuer: AcmeIssuer = issueAcmeCertificate;

/** Test seam: avoids reaching a public ACME service from the Core test suite. */
export function setAcmeIssuerForTests(replacement: AcmeIssuer | null): void {
  issuer = replacement ?? issueAcmeCertificate;
}

function renewalDue(certificate: TakServerCertificate | null, hostName: string, now: Date): boolean {
  return (
    certificate?.source !== "acme" ||
    certificate.hostName !== hostName ||
    certificate.notAfter.getTime() - now.getTime() <= RENEW_BEFORE_MS
  );
}

function safeFailureReason(error: unknown): string {
  const reason = error instanceof Error ? error.message : "Unknown ACME error";
  return sanitizeLogMessage(reason).slice(0, 500);
}

class TakAcmeManager {
  private timer: NodeJS.Timeout | null = null;
  private renewal: Promise<TakServerCertificate | null> | null = null;

  get running(): boolean {
    return this.renewal !== null;
  }

  start(): void {
    this.timer ??= setInterval(() => void this.ensureDue(), CHECK_INTERVAL_MS).unref();
    void this.ensureDue();
  }

  stop(): void {
    if (this.timer !== null) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  ensureDue(now = new Date()): Promise<TakServerCertificate | null> {
    return this.run(false, now);
  }

  renewNow(now = new Date()): Promise<TakServerCertificate | null> {
    return this.run(true, now);
  }

  private run(force: boolean, now: Date): Promise<TakServerCertificate | null> {
    this.renewal ??= this.runOnce(force, now).finally(() => {
      this.renewal = null;
    });
    return this.renewal;
  }

  private async runOnce(force: boolean, now: Date): Promise<TakServerCertificate | null> {
    const [settings, server, certificate] = await Promise.all([
      loadTakAcmeSettings(),
      loadTakServerSettings(),
      activeServerCertificate(),
    ]);
    if (!settings.enabled || server.hostName === null || (!force && !renewalDue(certificate, server.hostName, now))) {
      return certificate;
    }

    await database.takAcmeSettings.update({
      where: { id: ACME_SETTINGS_ID },
      data: { lastAttemptAt: now, lastError: null },
    });
    try {
      const issued = await issuer(settings, server.hostName);
      await database.takAcmeSettings.update({
        where: { id: ACME_SETTINGS_ID },
        data: { lastSuccessAt: new Date(), lastError: null },
      });
      logger.info(
        { event: "tak_acme_certificate_issued", hostName: server.hostName, notAfter: issued.notAfter.toISOString() },
        "Public TAK server certificate issued",
      );
      await takListeners.reload();
      return issued;
    } catch (error: unknown) {
      const reason = safeFailureReason(error);
      await database.takAcmeSettings.update({ where: { id: ACME_SETTINGS_ID }, data: { lastError: reason } });
      logger.error({ error, event: "tak_acme_certificate_failed", hostName: server.hostName }, "Public TAK certificate issuance failed");
      throw error;
    }
  }
}

export const takAcmeManager = new TakAcmeManager();
