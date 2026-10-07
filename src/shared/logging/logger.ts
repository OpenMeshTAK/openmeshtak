import pino, { type DestinationStream } from "pino";
import { config } from "../config/config.js";
import {
  sanitizeLogMessage,
  sanitizeLogMetadataOrFallback,
  type LogMetadata,
} from "./sanitize.js";
import { recentLogDestination } from "./recent-logs.js";

type LogLevel = "debug" | "info" | "warn" | "error" | "fatal";
export type Logger = Readonly<Record<LogLevel, (metadata: LogMetadata, message: string) => void>>;

/**
 * Production output goes to stdout and, for the live server log, to the in-memory buffer. Both
 * receive the same already-sanitized lines; the logger's level does the filtering.
 */
function defaultDestination(): DestinationStream {
  return pino.multistream([
    { level: "trace", stream: pino.destination(1) },
    { level: "trace", stream: recentLogDestination() },
  ]);
}

/** Every log line passes the sanitizer; destination and level are replaceable only for tests. */
export function createLogger(destination: DestinationStream = defaultDestination(), level: string = config.logLevel): Logger {
  const rawLogger = pino(
    {
      base: null,
      level,
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
    },
    destination,
  );

  const write =
    (level: LogLevel) =>
    (metadata: LogMetadata, message: string): void => {
      rawLogger[level](sanitizeLogMetadataOrFallback(metadata), sanitizeLogMessage(message));
    };

  return Object.freeze({
    debug: write("debug"),
    info: write("info"),
    warn: write("warn"),
    error: write("error"),
    fatal: write("fatal"),
  });
}

export const logger = createLogger();
