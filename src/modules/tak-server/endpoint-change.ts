import { isPlaceholderEmail } from "../auth/claim-session.plugin.js";
import { renderEmail } from "../email/email-layout.js";
import { sendEmailInBackground } from "../email/mailer.js";
import { instanceName } from "../instance-settings/instance-settings.service.js";
import { config } from "../../shared/config/config.js";
import { database } from "../../shared/database/database.js";

/** The public address that QR codes, profiles and enrolled apps point to. */
export interface TakEndpoint {
  hostName: string | null;
  enrollmentPort: number;
  martiPort: number;
  streamingPort: number;
}

/** ATAK Quick Connect defaults; anything else is an explicit, confirmed administrator decision. */
export const STANDARD_TAK_PORTS = { enrollmentPort: 8446, martiPort: 8443, streamingPort: 8089 } as const;

type PortField = keyof typeof STANDARD_TAK_PORTS;
const PORT_FIELDS = Object.keys(STANDARD_TAK_PORTS) as PortField[];

/**
 * A change only counts once the server had a host name: before that, no app can have enrolled, so
 * the first setup is not a migration.
 */
export function endpointChanged(before: TakEndpoint, after: TakEndpoint): boolean {
  return before.hostName !== null && (before.hostName !== after.hostName || PORT_FIELDS.some((field) => before[field] !== after[field]));
}

/** Ports that this save moves to a non-standard value; they need the administrator's confirmation. */
export function newNonStandardPorts(before: TakEndpoint, after: TakEndpoint): PortField[] {
  return PORT_FIELDS.filter((field) => after[field] !== before[field] && after[field] !== STANDARD_TAK_PORTS[field]);
}

/** Valid certificates, optionally only those issued before a moment such as the last endpoint change. */
function validCertificates(now: Date, issuedBefore?: Date) {
  return {
    revokedAt: null,
    notAfter: { gt: now },
    ...(issuedBefore === undefined ? {} : { createdAt: { lt: issuedBefore } }),
  };
}

export function countValidClientCertificates(now: Date, issuedBefore?: Date): Promise<number> {
  return database.takClientCertificate.count({ where: validCertificates(now, issuedBefore) });
}

/**
 * Emails every user with a valid certificate that their TAK app must enroll again. Apps keep the
 * old address until then; Core cannot reach them to rewrite it.
 */
export async function notifyEndpointChange(endpoint: TakEndpoint, now: Date): Promise<void> {
  const users = await database.domainUser.findMany({
    where: { takClientCertificates: { some: validCertificates(now) } },
    select: { displayName: true, authSubject: { select: { email: true, emailVerified: true } } },
  });
  const name = await instanceName();
  for (const user of users) {
    const address = user.authSubject;
    if (address === null || !address.emailVerified || isPlaceholderEmail(address.email)) {
      continue;
    }
    sendEmailInBackground(
      {
        to: address.email,
        subject: "Set up your TAK app again",
        ...renderEmail({
          instanceName: name,
          title: "Set up your TAK app again",
          greeting: `Hello ${user.displayName},`,
          paragraphs: [
            `the TAK server moved to ${endpoint.hostName ?? "a new address"} (enrollment port ${String(endpoint.enrollmentPort)}, streaming port ${String(endpoint.streamingPort)}, Data Package port ${String(endpoint.martiPort)}).`,
            `Your TAK app still uses the old address and cannot connect until you set it up again: open ${name}, choose "Connect a TAK app" and follow the steps.`,
          ],
          action: { label: `Open ${name}`, url: config.publicOrigin },
        }),
      },
      "tak-endpoint-changed",
    );
  }
}
