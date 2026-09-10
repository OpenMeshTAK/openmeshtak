const REDACTED = "[REDACTED]";

const sensitiveKeyPattern = /(?:authorization|proxy-?authorization|cookie|set-?cookie|x-?api-?key|password|api-?key|credential|secret|token|session-?id|csrf|psk|private-?key|pkcs12|signing-?key)/i;
const openMeshTakSecretPattern = /omtk_(?:sa_[A-Za-z0-9_-]+_|bootstrap_|claim_)[A-Za-z0-9_-]+/g;
const privateKeyPattern = /-----BEGIN [A-Z0-9 ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z0-9 ]*PRIVATE KEY-----/g;

type SeenValues = WeakSet<object>;

export type LogMetadata = Record<string, unknown>;

function sanitizeString(value: string): string {
  return value
    .replace(privateKeyPattern, REDACTED)
    .replace(openMeshTakSecretPattern, REDACTED);
}

function sanitizeValue(value: unknown, seen: SeenValues): unknown {
  if (typeof value === "string") {
    return sanitizeString(value);
  }

  if (value === null || typeof value !== "object") {
    return value;
  }

  if (seen.has(value)) {
    return "[CIRCULAR]";
  }

  seen.add(value);

  if (value instanceof Error) {
    return {
      name: sanitizeString(value.name),
      message: sanitizeString(value.message),
      stack: value.stack === undefined ? undefined : sanitizeString(value.stack),
    };
  }

  if (Array.isArray(value)) {
    return value.map((item) => sanitizeValue(item, seen));
  }

  return Object.fromEntries(
    Object.entries(value).map(([key, nestedValue]) => [
      key,
      sensitiveKeyPattern.test(key) ? REDACTED : sanitizeValue(nestedValue, seen),
    ]),
  );
}

export function sanitizeLogMetadata(metadata: LogMetadata): LogMetadata {
  return sanitizeValue(metadata, new WeakSet<object>()) as LogMetadata;
}

export function sanitizeLogMetadataOrFallback(
  metadata: LogMetadata,
  sanitizer: (value: LogMetadata) => LogMetadata = sanitizeLogMetadata,
): LogMetadata {
  try {
    return sanitizer(metadata);
  } catch {
    return { event: "log_sanitization_failed" };
  }
}
