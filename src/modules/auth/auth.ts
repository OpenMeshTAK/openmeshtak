import { passkey } from "@better-auth/passkey";
import { prismaAdapter } from "@better-auth/prisma-adapter";
import { betterAuth } from "better-auth";
import { config } from "../../shared/config/config.js";
import { database } from "../../shared/database/database.js";
import { logger } from "../../shared/logging/logger.js";
import { RECENT_AUTHENTICATION_MAX_AGE_SECONDS } from "../../shared/auth/permission-check.js";
import { claimSessionPlugin } from "./claim-session.plugin.js";
import { passkeyAuditHook } from "./passkey-audit.js";

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
  },
  plugins: [
    claimSessionPlugin(),
    // WebAuthn binds credentials to the public origin; behind Caddy this is the HTTPS hostname.
    passkey({ rpID: publicOrigin.hostname, rpName: "OpenMeshTak", origin: publicOrigin.origin }),
  ],
  hooks: { after: passkeyAuditHook },
  session: {
    // Better Auth asks for a fresh session before credential changes such as registering a
    // passkey. Align it with the step-up window used for API keys.
    freshAge: RECENT_AUTHENTICATION_MAX_AGE_SECONDS,
  },
  // Better Auth would otherwise write to the console, bypassing redaction (LOGGING.md). Its extra
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
