import "dotenv/config";
import { z } from "zod";

const booleanFromString = z
  .enum(["true", "false"])
  .transform((value) => value === "true");

const environmentSchema = z.object({
  /** Swagger UI at /api/docs; on in development, off in production unless enabled explicitly. */
  SWAGGER_ENABLED: booleanFromString.optional(),
  APP_HOST: z.string().min(1).default("127.0.0.1"),
  APP_PORT: z.coerce.number().int().min(1).max(65_535).default(3000),
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
  /**
   * Ports the TAK listeners bind inside the container. They are deployment values, separate from
   * the public ports in the TAK server settings, which alone appear in participant material.
   */
  TAK_ENROLLMENT_LISTEN_PORT: z.coerce.number().int().min(1).max(65_535).default(8446),
  TAK_MARTI_LISTEN_PORT: z.coerce.number().int().min(1).max(65_535).default(8443),
  TAK_STREAMING_LISTEN_PORT: z.coerce.number().int().min(1).max(65_535).default(8089),
});

const environment = environmentSchema.parse(process.env);

if (
  new Set([environment.TAK_ENROLLMENT_LISTEN_PORT, environment.TAK_MARTI_LISTEN_PORT, environment.TAK_STREAMING_LISTEN_PORT, environment.APP_PORT])
    .size !== 4
) {
  throw new Error("APP_PORT and the TAK listen ports must all differ.");
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
  takListenPorts: Object.freeze({
    enrollment: environment.TAK_ENROLLMENT_LISTEN_PORT,
    marti: environment.TAK_MARTI_LISTEN_PORT,
    streaming: environment.TAK_STREAMING_LISTEN_PORT,
  }),
  trustProxy: environment.TRUST_PROXY,
  webRoot: environment.WEB_ROOT,
});
