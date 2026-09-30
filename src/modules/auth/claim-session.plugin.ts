import type { BetterAuthPlugin } from "better-auth";
import { createAuthEndpoint } from "better-auth/api";
import { setSessionCookie } from "better-auth/cookies";
import { z } from "zod";
import { assignMissingUsername } from "../users/usernames.js";

/**
 * Participants created by synchronization have no email address. Better Auth requires one, so a
 * claim creates a reserved, non-routable placeholder (RFC 2606 `.invalid`). It is never shown,
 * cannot receive mail and has no password, so nobody can sign in with it.
 */
export const PLACEHOLDER_EMAIL_DOMAIN = "participants.openmeshtak.invalid";

export function placeholderEmailFor(userId: string): string {
  return `${userId}@${PLACEHOLDER_EMAIL_DOMAIN}`;
}

export function isPlaceholderEmail(email: string): boolean {
  return email.endsWith(`@${PLACEHOLDER_EMAIL_DOMAIN}`);
}

const claimSessionBody = z.object({
  authSubjectId: z.string().optional(),
  name: z.string().min(1),
  placeholderEmail: z.string().min(1),
});

/**
 * Lets the claim service establish a normal Better Auth session after it has authorized and
 * consumed a claim. `SERVER_ONLY` keeps the endpoint off the HTTP router, so it is reachable only
 * through `auth.api` from trusted server code. OpenMeshTak still owns every authorization decision.
 */
export function claimSessionPlugin() {
  return {
    id: "openmeshtak-claim-session",
    endpoints: {
      createClaimSession: createAuthEndpoint(
        "/openmeshtak/claim-session",
        {
          method: "POST",
          body: claimSessionBody,
          metadata: { SERVER_ONLY: true },
        },
        async (ctx) => {
          const { authSubjectId, name, placeholderEmail } = ctx.body;
          const adapter = ctx.context.internalAdapter;

          const existing = authSubjectId === undefined ? null : await adapter.findUserById(authSubjectId);
          const user =
            existing ??
            (await adapter.createUser(
              { email: placeholderEmail, name, emailVerified: false },
              { method: "openmeshtak-claim" },
            ));
          // A participant needs a username to sign in later and to log in to TAK.
          await assignMissingUsername(user.id);
          const session = await adapter.createSession(user.id);

          await setSessionCookie(ctx, { session, user });
          return ctx.json({ authSubjectId: user.id });
        },
      ),
    },
  } satisfies BetterAuthPlugin;
}
