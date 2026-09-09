import pino from "pino";
import { config } from "../config/config.js";
import {
  sanitizeLogMetadataOrFallback,
  type LogMetadata,
} from "./sanitize.js";

const rawLogger = pino({
  base: null,
  level: config.logLevel,
  redact: {
    censor: "[REDACTED]",
    paths: [
      "authorization",
      "req.headers.authorization",
      "req.headers.cookie",
      "req.headers.x-api-key",
      "res.headers.set-cookie",
    ],
  },
  timestamp: pino.stdTimeFunctions.isoTime,
});

function safe(metadata: LogMetadata): LogMetadata {
  return sanitizeLogMetadataOrFallback(metadata);
}

export const logger = Object.freeze({
  debug(metadata: LogMetadata, message: string): void {
    rawLogger.debug(safe(metadata), message);
  },
  error(metadata: LogMetadata, message: string): void {
    rawLogger.error(safe(metadata), message);
  },
  fatal(metadata: LogMetadata, message: string): void {
    rawLogger.fatal(safe(metadata), message);
  },
  info(metadata: LogMetadata, message: string): void {
    rawLogger.info(safe(metadata), message);
  },
  warn(metadata: LogMetadata, message: string): void {
    rawLogger.warn(safe(metadata), message);
  },
});
