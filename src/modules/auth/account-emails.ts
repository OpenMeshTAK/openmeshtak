import { config } from "../../shared/config/config.js";
import { database } from "../../shared/database/database.js";
import { sendEmail, sendEmailInBackground } from "../email/mailer.js";
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

const FOOTER = `\n\n--\nOpenMeshTak · ${config.publicOrigin}\nIf this was not you, contact your organizers.`;

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
  sendEmailInBackground(
    {
      to: user.email,
      subject: "Reset your OpenMeshTak password",
      text: `${greeting(user)}\n\nsomeone asked to reset the password of your OpenMeshTak account. Open this link within 30 minutes to choose a new password:\n\n${url}\n\nThe link works once. If you did not ask for it, ignore this email; your password stays unchanged.${FOOTER}`,
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
  await sendEmail({
    to: user.email,
    subject: "Confirm your email address for OpenMeshTak",
    text: `${greeting(user)}\n\nplease confirm that this address belongs to your OpenMeshTak account by opening this link:\n\n${url}\n\nUntil you confirm it, the address is not used for your account.${FOOTER}`,
  });

  const current = await database.user.findUnique({ where: { id: user.id }, select: { email: true, emailVerified: true } });
  if (current !== null && current.email !== user.email && current.emailVerified && !isPlaceholderEmail(current.email)) {
    sendEmailInBackground(
      {
        to: current.email,
        subject: "Your OpenMeshTak email address is being changed",
        text: `${greeting(user)}\n\nsomeone asked to change the email address of your OpenMeshTak account to ${user.email}. The change only happens once the new address is confirmed.${FOOTER}`,
      },
      "email-change-notice",
    );
  }
}

const NOTICES: Record<string, { subject: string; body: string }> = {
  "password.changed": { subject: "Your OpenMeshTak password was changed", body: "the password of your OpenMeshTak account was just changed, and your other sessions were signed out." },
  "password.reset": { subject: "Your OpenMeshTak password was reset", body: "the password of your OpenMeshTak account was just reset with an email link, and all sessions were signed out." },
  "passkey.registered": { subject: "A passkey was added to your OpenMeshTak account", body: "a new passkey was just added to your OpenMeshTak account." },
  "passkey.deleted": { subject: "A passkey was removed from your OpenMeshTak account", body: "a passkey was just removed from your OpenMeshTak account." },
};

/** Tells the verified address of an account about a credential change. Never blocks the change. */
export async function sendSecurityNotice(authSubjectId: string, event: string): Promise<void> {
  const notice = NOTICES[event];
  const user = await database.user.findUnique({ where: { id: authSubjectId }, select: { id: true, email: true, name: true, emailVerified: true } });
  if (notice === undefined || user === null || !user.emailVerified || isPlaceholderEmail(user.email)) {
    return;
  }
  sendEmailInBackground({ to: user.email, subject: notice.subject, text: `${greeting(user)}\n\n${notice.body}${FOOTER}` }, event);
}
