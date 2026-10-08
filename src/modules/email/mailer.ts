import { readFile } from "node:fs/promises";
import nodemailer, { type Transporter } from "nodemailer";
import type { EmailSettings } from "../../generated/prisma/client.js";
import { decryptSecret, encryptSecret } from "../../shared/crypto/secret-box.js";
import { database } from "../../shared/database/database.js";
import { logger } from "../../shared/logging/logger.js";
import { EMAIL_LOGO_CID, type RenderedEmail } from "./email-layout.js";

export const EMAIL_SETTINGS_ID = "email";

/** The body always comes from `renderEmail`, the only place that writes HTML and escapes values. */
export interface OutgoingEmail extends RenderedEmail {
  to: string;
  subject: string;
}

const LOGO_FILE = new URL("../../../assets/email-logo.png", import.meta.url);
let logo: Promise<Buffer> | null = null;

/** Attached inline instead of linked, so clients that block remote images still show it. */
function emailLogo(): Promise<Buffer> {
  logo ??= readFile(LOGO_FILE);
  return logo;
}

export class EmailNotConfiguredError extends Error {}

export function encryptSmtpPassword(password: string): string {
  return encryptSecret(Buffer.from(password, "utf8"), "smtp-password", EMAIL_SETTINGS_ID);
}

function smtpPassword(settings: EmailSettings): string | undefined {
  return settings.passwordEnvelope === null
    ? undefined
    : decryptSecret(settings.passwordEnvelope, "smtp-password", EMAIL_SETTINGS_ID).toString("utf8");
}

export async function loadEmailSettings(): Promise<EmailSettings | null> {
  return database.emailSettings.findUnique({ where: { id: EMAIL_SETTINGS_ID } });
}

/**
 * Builds a transport from the stored settings for every send, so changed settings apply at once.
 * Nodemailer's own logging stays off; it could print credentials or message bodies.
 */
function transportFor(settings: EmailSettings): Transporter {
  const password = smtpPassword(settings);
  return nodemailer.createTransport({
    host: settings.host ?? "",
    port: settings.port,
    secure: settings.security === "tls",
    requireTLS: settings.security === "starttls",
    ignoreTLS: settings.security === "none",
    auth: settings.username === null ? undefined : { user: settings.username, pass: password },
    logger: false,
    debug: false,
    connectionTimeout: 15_000,
    socketTimeout: 30_000,
  });
}

/** For tests: replaces SMTP delivery, e.g. with an in-memory outbox. */
let deliver: ((settings: EmailSettings, email: OutgoingEmail) => Promise<void>) | null = null;

export function setEmailDeliveryForTests(handler: typeof deliver): void {
  deliver = handler;
}

/** Sends one email or throws; callers decide whether a failure matters to the user. */
export async function sendEmail(email: OutgoingEmail, settings?: EmailSettings): Promise<void> {
  const current = settings ?? (await loadEmailSettings());
  if (current === null || !current.enabled || current.host === null || current.fromAddress === null) {
    throw new EmailNotConfiguredError("email delivery is not configured");
  }
  if (deliver !== null) {
    await deliver(current, email);
    return;
  }
  await transportFor(current).sendMail({
    from: { name: current.fromName, address: current.fromAddress },
    to: email.to,
    subject: email.subject,
    text: email.text,
    html: email.html,
    attachments: [{ filename: "logo.png", content: await emailLogo(), cid: EMAIL_LOGO_CID }],
  });
}

/**
 * For notifications that must not block the action that caused them, such as a security notice
 * after a password change. Failures are logged without the address or the body.
 */
export function sendEmailInBackground(email: OutgoingEmail, event: string): void {
  sendEmail(email).catch((error: unknown) => {
    if (!(error instanceof EmailNotConfiguredError)) {
      logger.warn({ error, event: "email_delivery_failed", emailEvent: event }, "Email delivery failed");
    }
  });
}
