import type { TakServerCertificate } from "../../generated/prisma/client.js";
import { config } from "../../shared/config/config.js";
import { INSTANCE_SCOPE_KEY } from "../../shared/auth/permissions.js";
import { database } from "../../shared/database/database.js";
import { logger } from "../../shared/logging/logger.js";
import { sendEmailInBackground } from "../email/mailer.js";
import { instanceName } from "../instance-settings/instance-settings.service.js";
import { loadTakAcmeSettings } from "./acme-settings.js";
import { activeServerCertificate } from "./server-certificate.js";

const DAY = 86_400_000;
/** Administrators hear about an expiring public certificate at these remaining days. */
const WARN_AT_DAYS = [14, 3] as const;

/**
 * The warning level due now, or null. A level counts as sent once a warning went out after the
 * certificate entered it, so each level is sent once per certificate.
 */
export function dueExpiryWarning(certificate: Pick<TakServerCertificate, "notAfter" | "expiryWarningSentAt">, now: Date): number | null {
  const remainingDays = (certificate.notAfter.getTime() - now.getTime()) / DAY;
  for (const days of [...WARN_AT_DAYS].sort((a, b) => a - b)) {
    if (remainingDays > days) {
      continue;
    }
    const levelStart = certificate.notAfter.getTime() - days * DAY;
    const sent = certificate.expiryWarningSentAt;
    return sent !== null && sent.getTime() >= levelStart ? null : days;
  }
  return null;
}

/** Verified addresses of active users who may manage the TAK server installation-wide. */
async function administratorAddresses(): Promise<string[]> {
  const grants = await database.permissionGrant.findMany({
    where: { permission: "tak-server.manage", scopeKey: INSTANCE_SCOPE_KEY },
    select: {
      userGroup: {
        select: {
          memberships: {
            select: { user: { select: { disabledAt: true, authSubject: { select: { email: true, emailVerified: true } } } } },
          },
        },
      },
    },
  });
  const addresses = grants.flatMap(({ userGroup }) =>
    userGroup.memberships.flatMap(({ user }) =>
      user.disabledAt === null && user.authSubject?.emailVerified === true ? [user.authSubject.email] : [],
    ),
  );
  return [...new Set(addresses)];
}

async function adviceFor(certificate: TakServerCertificate): Promise<string> {
  if (certificate.source === "acme") {
    const acme = await loadTakAcmeSettings();
    const reason = acme.lastError === null ? "" : ` The last attempt failed with: ${acme.lastError}`;
    return `Let's Encrypt has not renewed it yet.${reason} Check the TAK server settings and use "Test setup" to find the problem.`;
  }
  return "OpenMeshTak cannot renew an uploaded certificate. Upload the renewed one on the TAK server page before it expires.";
}

/**
 * Emails administrators when the public TAK server certificate is about to expire. When it does,
 * the TAK listeners fall back to the OpenMeshTak CA and apps set up by QR code stop trusting the
 * server, so this must not go unnoticed.
 */
export async function warnAboutExpiringCertificate(now = new Date()): Promise<void> {
  const certificate = await activeServerCertificate();
  if (certificate === null || certificate.source === "issued" || certificate.notAfter <= now) {
    return;
  }
  const days = dueExpiryWarning(certificate, now);
  if (days === null) {
    return;
  }

  const recipients = await administratorAddresses();
  const name = await instanceName();
  const expires = certificate.notAfter.toUTCString();
  const advice = await adviceFor(certificate);
  for (const to of recipients) {
    sendEmailInBackground(
      {
        to,
        subject: `${name}: the TAK server certificate expires in ${String(Math.ceil((certificate.notAfter.getTime() - now.getTime()) / DAY))} days`,
        text: `Hello,\n\nthe certificate of the TAK server ${certificate.hostName} expires on ${expires}.\n\n${advice}\n\nOnce it has expired, the TAK server uses its own certificate authority, and TAK apps that were set up by QR code can no longer connect.\n\n--\n${name} · ${config.publicOrigin}`,
      },
      "tak-certificate-expiry",
    );
  }
  await database.takServerCertificate.update({ where: { id: certificate.id }, data: { expiryWarningSentAt: now } });
  logger.warn(
    { event: "tak_certificate_expiry_warning", hostName: certificate.hostName, notAfter: certificate.notAfter.toISOString(), recipients: recipients.length },
    "TAK server certificate expires soon",
  );
}
