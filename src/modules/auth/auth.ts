import { passkey } from "@better-auth/passkey";
import { prismaAdapter } from "@better-auth/prisma-adapter";
import { betterAuth } from "better-auth";
import { APIError } from "better-auth/api";
import { username } from "better-auth/plugins";
import { config } from "../../shared/config/config.js";
import { database } from "../../shared/database/database.js";
import { logger } from "../../shared/logging/logger.js";
import { RECENT_AUTHENTICATION_MAX_AGE_SECONDS } from "../../shared/auth/permission-check.js";
import { claimSessionPlugin } from "./claim-session.plugin.js";
import { sendPasswordResetEmail, sendSecurityNotice, sendVerificationEmail } from "./account-emails.js";
import { credentialChangeHook } from "./credential-change-hook.js";
import { isValidUsername, USERNAME_MAX_LENGTH, USERNAME_MIN_LENGTH } from "../users/usernames.js";

export const AUTH_BASE_PATH = "/api/auth";

const publicOrigin = new URL(config.publicOrigin);

export const auth = betterAuth({
  appName: "OpenMeshTak",
  basePath: AUTH_BASE_PATH,
  baseURL: config.publicOrigin,
  database: prismaAdapter(database, {
    provider: "sqlite",
  }),
  emailAndPassword: {
    autoSignIn: true,
    enabled: true,
    minPasswordLength: 12,
    sendResetPassword: sendPasswordResetEmail,
    resetPasswordTokenExpiresIn: 30 * 60,
    // A reset proves control of the email, not of the sessions; end them all.
    revokeSessionsOnPasswordReset: true,
    onPasswordReset: async ({ user }) => {
      await sendSecurityNotice(user.id, "password.reset");
    },
  },
  emailVerification: {
    sendVerificationEmail,
    expiresIn: 24 * 60 * 60,
  },
  user: {
    // Changing the address sends a verification link to the new address (see account-emails).
    changeEmail: { enabled: true },
  },
  plugins: [
    claimSessionPlugin(),
    // Sign-in by username; the plugin lowercases it, so "Peter" and "peter" are the same account.
    username({
      minUsernameLength: USERNAME_MIN_LENGTH,
      maxUsernameLength: USERNAME_MAX_LENGTH,
      usernameValidator: (value) => isValidUsername(value.toLowerCase()),
      // Usernames are TAK login names; they change only through OpenMeshTak's own audited
      // account setup and user administration, never through Better Auth's /update-user.
      immutableUsername: true,
    }),
    // WebAuthn binds credentials to the public origin; behind Caddy this is the HTTPS hostname.
    passkey({ rpID: publicOrigin.hostname, rpName: "OpenMeshTak", origin: publicOrigin.origin }),
  ],
  hooks: { after: credentialChangeHook },
  databaseHooks: {
    session: {
      create: {
        // Every way to sign in (password, passkey, access link) ends in a new session, so this one
        // check keeps disabled accounts out everywhere.
        before: async (session) => {
          const user = await database.domainUser.findUnique({
            where: { authSubjectId: session.userId },
            select: { disabledAt: true },
          });
          if (user?.disabledAt != null) {
            throw new APIError("FORBIDDEN", { message: "This account is disabled." });
          }
        },
      },
    },
  },
  session: {
    // Better Auth asks for a fresh session before credential changes such as registering a
    // passkey. Align it with the step-up window used for API keys.
    freshAge: RECENT_AUTHENTICATION_MAX_AGE_SECONDS,
  },
  // Better Auth would otherwise write to the console, bypassing log redaction. Its extra
  // arguments can be raw errors with request details, so they go through the sanitizer too.
  logger: {
    log: (level, message, ...details: unknown[]) => {
      logger[level]({ event: "better_auth_log", details }, message);
    },
  },
  secret: config.authSecret,
  trustedOrigins: [config.publicOrigin],
  rateLimit: {
    enabled: true,
  },
  advanced: {
    cookiePrefix: "openmeshtak",
    database: {
      generateId: "uuid",
      joins: true,
    },
    useSecureCookies: config.nodeEnvironment === "production",
  },
});
