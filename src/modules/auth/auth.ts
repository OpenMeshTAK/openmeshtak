import { passkey } from "@better-auth/passkey";
import { prismaAdapter } from "@better-auth/prisma-adapter";
import { betterAuth } from "better-auth";
import { config } from "../../shared/config/config.js";
import { database } from "../../shared/database/database.js";
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
