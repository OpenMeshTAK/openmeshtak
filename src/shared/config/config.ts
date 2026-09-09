import "dotenv/config";
import { z } from "zod";

const booleanFromString = z
  .enum(["true", "false"])
  .transform((value) => value === "true");

const environmentSchema = z.object({
  API_DOCS_ENABLED: booleanFromString.default(true),
  APP_HOST: z.string().min(1).default("127.0.0.1"),
  APP_PORT: z.coerce.number().int().min(1).max(65_535).default(3000),
  DATABASE_URL: z
    .string()
    .startsWith("file:")
    .default("file:./server/data/db/openmeshtak.sqlite"),
  LOG_LEVEL: z
    .enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"])
    .default("info"),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PUBLIC_ORIGIN: z.url().default("http://localhost:3000"),
  TRUST_PROXY: booleanFromString.default(false),
});

const environment = environmentSchema.parse(process.env);

export const config = Object.freeze({
  apiDocsEnabled: environment.API_DOCS_ENABLED,
  databaseUrl: environment.DATABASE_URL,
  host: environment.APP_HOST,
  logLevel: environment.LOG_LEVEL,
  nodeEnvironment: environment.NODE_ENV,
  port: environment.APP_PORT,
  publicOrigin: environment.PUBLIC_ORIGIN,
  trustProxy: environment.TRUST_PROXY,
});
