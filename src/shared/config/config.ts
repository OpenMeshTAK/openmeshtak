import "dotenv/config";
import { randomBytes } from "node:crypto";
import { z } from "zod";

const booleanFromString = z
  .enum(["true", "false"])
  .transform((value) => value === "true");

const environmentSchema = z.object({
  /** Swagger UI at /api/docs; on in development, off in production unless enabled explicitly. */
  SWAGGER_ENABLED: booleanFromString.optional(),
  APP_HOST: z.string().min(1).default("127.0.0.1"),
  APP_PORT: z.coerce.number().int().min(1).max(65_535).default(3000),
  BETTER_AUTH_SECRET: z.string().min(32).optional(),
  BOOTSTRAP_TOKEN_TTL_MINUTES: z.coerce.number().int().min(5).max(60).default(15),
  DATABASE_URL: z
    .string()
    .startsWith("file:")
    .default("file:./server/data/db/openmeshtak.sqlite"),
  DATA_DIRECTORY: z.string().min(1).default("./server/data"),
  LOG_LEVEL: z
    .enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"])
    .default("info"),
  /** Extra firmware-profile directories, separated like PATH; mainly for test-only profiles. */
  MESHTASTIC_FIRMWARE_PROFILE_DIRS: z.string().min(1).optional(),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PUBLIC_ORIGIN: z.url().default("http://localhost:3000"),
  ROOT_ENCRYPTION_KEY_FILE: z.string().min(1).optional(),
  TRUST_PROXY: booleanFromString.default(false),
  /** Built Web app that Core serves on the same origin; the image sets it, development uses Vite. */
  WEB_ROOT: z.string().min(1).optional(),
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
  apiDocsEnabled: environment.SWAGGER_ENABLED ?? environment.NODE_ENV !== "production",
  authSecret: environment.BETTER_AUTH_SECRET ?? randomBytes(32).toString("base64url"),
  bootstrapTokenTtlMinutes: environment.BOOTSTRAP_TOKEN_TTL_MINUTES,
  databaseUrl: environment.DATABASE_URL,
  dataDirectory: environment.DATA_DIRECTORY,
  host: environment.APP_HOST,
  logLevel: environment.LOG_LEVEL,
  meshtasticFirmwareProfileDirs: environment.MESHTASTIC_FIRMWARE_PROFILE_DIRS,
  nodeEnvironment: environment.NODE_ENV,
  port: environment.APP_PORT,
  publicOrigin: environment.PUBLIC_ORIGIN,
  rootEncryptionKeyFile: environment.ROOT_ENCRYPTION_KEY_FILE,
  trustProxy: environment.TRUST_PROXY,
  webRoot: environment.WEB_ROOT,
});
