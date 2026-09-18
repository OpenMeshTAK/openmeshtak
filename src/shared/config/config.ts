import "dotenv/config";
import { randomBytes } from "node:crypto";
import { z } from "zod";

const booleanFromString = z
  .enum(["true", "false"])
  .transform((value) => value === "true");

const environmentSchema = z.object({
  API_DOCS_ENABLED: booleanFromString.default(true),
  APP_HOST: z.string().min(1).default("127.0.0.1"),
  APP_PORT: z.coerce.number().int().min(1).max(65_535).default(3000),
  BETTER_AUTH_SECRET: z.string().min(32).optional(),
  BOOTSTRAP_TOKEN_TTL_MINUTES: z.coerce.number().int().min(5).max(60).default(15),
  DATABASE_URL: z
    .string()
    .startsWith("file:")
    .default("file:./server/data/db/openmeshtak.sqlite"),
  LOG_LEVEL: z
    .enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"])
    .default("info"),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PUBLIC_ORIGIN: z.url().default("http://localhost:3000"),
  ROOT_ENCRYPTION_KEY_FILE: z.string().min(1).optional(),
  TRUST_PROXY: booleanFromString.default(false),
});

const environment = environmentSchema.parse(process.env);

if (environment.NODE_ENV === "production" && environment.BETTER_AUTH_SECRET === undefined) {
  throw new Error("BETTER_AUTH_SECRET is required in production.");
}

if (
  environment.NODE_ENV === "production" &&
  environment.ROOT_ENCRYPTION_KEY_FILE === undefined
) {
  throw new Error("ROOT_ENCRYPTION_KEY_FILE is required in production.");
}

if (
  environment.NODE_ENV === "production" &&
  new URL(environment.PUBLIC_ORIGIN).protocol !== "https:"
) {
  throw new Error("PUBLIC_ORIGIN must use HTTPS in production.");
}

export const config = Object.freeze({
  apiDocsEnabled: environment.API_DOCS_ENABLED,
  authSecret: environment.BETTER_AUTH_SECRET ?? randomBytes(32).toString("base64url"),
  bootstrapTokenTtlMinutes: environment.BOOTSTRAP_TOKEN_TTL_MINUTES,
  databaseUrl: environment.DATABASE_URL,
  host: environment.APP_HOST,
  logLevel: environment.LOG_LEVEL,
  nodeEnvironment: environment.NODE_ENV,
  port: environment.APP_PORT,
  publicOrigin: environment.PUBLIC_ORIGIN,
  rootEncryptionKeyFile: environment.ROOT_ENCRYPTION_KEY_FILE,
  trustProxy: environment.TRUST_PROXY,
});
