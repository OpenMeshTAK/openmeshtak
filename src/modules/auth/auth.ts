import { prismaAdapter } from "@better-auth/prisma-adapter";
import { betterAuth } from "better-auth";
import { config } from "../../shared/config/config.js";
import { database } from "../../shared/database/database.js";
import { claimSessionPlugin } from "./claim-session.plugin.js";

export const AUTH_BASE_PATH = "/api/auth";

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
  plugins: [claimSessionPlugin()],
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
