import { config } from "../../shared/config/config.js";
import { database } from "../../shared/database/database.js";
import { sendEmail, sendEmailInBackground } from "../email/mailer.js";
import { instanceName } from "../instance-settings/instance-settings.service.js";
import { isPlaceholderEmail } from "./claim-session.plugin.js";

/** The minimal Better Auth user fields these emails need. */
interface AuthUser {
  id: string;
  email: string;
  name: string;
  emailVerified: boolean;
}

function greeting(user: AuthUser): string {
  return `Hello ${user.name},`;
}

function footer(name: string): string {
  return `\n\n--\n${name} · ${config.publicOrigin}\nIf this was not you, contact your organizers.`;
}

/** Whether the account may receive a password reset: verified, real address and not disabled. */
async function mayResetPassword(user: AuthUser): Promise<boolean> {
  if (!user.emailVerified || isPlaceholderEmail(user.email)) {
    return false;
  }
  const domainUser = await database.domainUser.findUnique({ where: { authSubjectId: user.id }, select: { disabledAt: true } });
  return domainUser !== null && domainUser.disabledAt === null;
}

/**
 * Better Auth answers every reset request the same way, whether or not an account exists; this
 * callback only decides whether an email actually goes out. Unverified addresses never get one,
 * because nobody has proven they own them.
 */
export async function sendPasswordResetEmail({ user, url }: { user: AuthUser; url: string }): Promise<void> {
  if (!(await mayResetPassword(user))) {
    return;
  }
  const name = await instanceName();
  sendEmailInBackground(
    {
      to: user.email,
      subject: `Reset your ${name} password`,
      text: `${greeting(user)}\n\nsomeone asked to reset the password of your ${name} account. Open this link within 30 minutes to choose a new password:\n\n${url}\n\nThe link works once. If you did not ask for it, ignore this email; your password stays unchanged.${footer(name)}`,
    },
    "password-reset",
  );
}

/**
 * Sent to the address that is being verified: a newly added or changed address. When an existing
 * verified address is replaced, its owner also gets a notice, so a hijacked session cannot move
 * the account to another address unnoticed.
 */
export async function sendVerificationEmail({ user, url }: { user: AuthUser; url: string }): Promise<void> {
  const name = await instanceName();
  await sendEmail({
    to: user.email,
    subject: `Confirm your email address for ${name}`,
    text: `${greeting(user)}\n\nplease confirm that this address belongs to your ${name} account by opening this link:\n\n${url}\n\nUntil you confirm it, the address is not used for your account.${footer(name)}`,
  });

  const current = await database.user.findUnique({ where: { id: user.id }, select: { email: true, emailVerified: true } });
  if (current !== null && current.email !== user.email && current.emailVerified && !isPlaceholderEmail(current.email)) {
    sendEmailInBackground(
      {
        to: current.email,
        subject: `Your ${name} email address is being changed`,
        text: `${greeting(user)}\n\nsomeone asked to change the email address of your ${name} account to ${user.email}. The change only happens once the new address is confirmed.${footer(name)}`,
      },
      "email-change-notice",
    );
  }
}

/**
 * Tells the previous, verified address that an administrator changed or removed it, because the
 * address is where password resets go.
 */
export async function sendAdministratorEmailChangeNotice(previous: string, userName: string, next: string | null): Promise<void> {
  const name = await instanceName();
  sendEmailInBackground(
    {
      to: previous,
      subject: `Your ${name} email address was changed`,
      text: `Hello ${userName},\n\nan administrator ${next === null ? "removed this email address from" : "changed the email address of"} your ${name} account${next === null ? "" : ` to ${next}`}. Password resets no longer go to this address.${footer(name)}`,
    },
    "email-change-notice",
  );
}

const NOTICES: Record<string, { subject: (name: string) => string; body: (name: string) => string }> = {
  "password.changed": {
    subject: (name) => `Your ${name} password was changed`,
    body: (name) => `the password of your ${name} account was just changed, and your other sessions were signed out.`,
  },
  "password.reset": {
    subject: (name) => `Your ${name} password was reset`,
    body: (name) => `the password of your ${name} account was just reset with an email link, and all sessions were signed out.`,
  },
  "passkey.registered": {
    subject: (name) => `A passkey was added to your ${name} account`,
    body: (name) => `a new passkey was just added to your ${name} account.`,
  },
  "passkey.deleted": {
    subject: (name) => `A passkey was removed from your ${name} account`,
    body: (name) => `a passkey was just removed from your ${name} account.`,
  },
};

/** Tells the verified address of an account about a credential change. Never blocks the change. */
export async function sendSecurityNotice(authSubjectId: string, event: string): Promise<void> {
  const notice = NOTICES[event];
  const user = await database.user.findUnique({ where: { id: authSubjectId }, select: { id: true, email: true, name: true, emailVerified: true } });
  if (notice === undefined || user === null || !user.emailVerified || isPlaceholderEmail(user.email)) {
    return;
  }
  const name = await instanceName();
  sendEmailInBackground({ to: user.email, subject: notice.subject(name), text: `${greeting(user)}\n\n${notice.body(name)}${footer(name)}` }, event);
}
