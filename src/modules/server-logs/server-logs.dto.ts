export type ServerLogLevel = "trace" | "debug" | "info" | "warn" | "error" | "fatal";

export interface ServerLogEntryDto {
  /** Increases by one per line since Core started; poll with the last one seen. */
  sequence: number;
  /** ISO 8601 time the line was written. */
  time: string | null;
  level: ServerLogLevel;
  message: string;
  /** The remaining structured fields as JSON, already sanitized like the container log. */
  details: string | null;
}

export interface ServerLogPage {
  items: ServerLogEntryDto[];
  /** Pass as `after` on the next request to receive only newer lines. */
  latestSequence: number;
  /** True when `items` starts a fresh view: no `after` was given or Core restarted since. */
  reset: boolean;
}
