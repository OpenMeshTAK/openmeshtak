import type { Prisma } from "../../generated/prisma/client.js";
import { database } from "../../shared/database/database.js";
import { auth } from "./auth.js";
import { placeholderEmailFor } from "./claim-session.plugin.js";

/**
 * Whether an authentication subject can sign in on its own, with a password or a passkey. Links
 * that sign someone in (access links, setup links) are refused for such accounts, so a leaked or
 * mis-sent link never becomes a session of an account that may hold administrative rights.
 */
export async function hasOwnSignIn(client: Prisma.TransactionClient, authSubjectId: string | null): Promise<boolean> {
  if (authSubjectId === null) {
    return false;
  }
  const [password, passkey] = await Promise.all([
    client.account.findFirst({
      where: { userId: authSubjectId, providerId: "credential", password: { not: null } },
      select: { id: true },
    }),
    client.passkey.findFirst({ where: { userId: authSubjectId }, select: { id: true } }),
  ]);
  return password !== null || passkey !== null;
}

/** Removes an authentication subject whose OpenMeshTak user could not be created after all. */
export async function removeIncompleteAuthSubject(authSubjectId: string): Promise<void> {
  await database.$transaction([
    database.session.deleteMany({ where: { userId: authSubjectId } }),
    database.account.deleteMany({ where: { userId: authSubjectId } }),
    database.user.deleteMany({ where: { id: authSubjectId } }),
  ]);
}

export interface LinkSessionUser {
  userId: string;
  displayName: string;
  authSubjectId: string | null;
}

/**
 * Opens a normal browser session for a user whose single-use link was just consumed. A user
 * without an authentication subject receives one here, with a placeholder email address.
 * Returns the `Set-Cookie` headers of the new session.
 */
export async function openLinkSession(user: LinkSessionUser): Promise<Headers> {
  const session = await auth.api.createClaimSession({
    body: {
      ...(user.authSubjectId === null ? {} : { authSubjectId: user.authSubjectId }),
      name: user.displayName,
      placeholderEmail: placeholderEmailFor(user.userId),
    },
    returnHeaders: true,
  });

  if (user.authSubjectId === null) {
    const linked = await database.domainUser.updateMany({
      where: { id: user.userId, authSubjectId: null },
      data: { authSubjectId: session.response.authSubjectId },
    });
    if (linked.count !== 1) {
      // Another exchange linked a subject first. Fail closed instead of returning a session for
      // an authentication subject that is not linked to this user.
      throw new Error("Link exchange lost the authentication-subject link race.");
    }
  }
  return session.headers;
}
