import type { DestinationStream } from "pino";

/** Lines kept for the live server log; older lines are only in the container log. */
export const RECENT_LOG_CAPACITY = 2000;

export interface RecentLogLine {
  sequence: number;
  line: string;
}

/**
 * The most recent Core log lines in memory, exactly as written to stdout. Lines arrive here only
 * after the logger's sanitizer and Pino redaction, so this buffer never holds more than the
 * container log does. Nothing is persisted; a restart starts empty.
 */
export class RecentLogBuffer {
  private lines: RecentLogLine[] = [];
  private nextSequence = 1;
  private readonly listeners = new Set<(line: RecentLogLine) => void>();

  constructor(private readonly capacity = RECENT_LOG_CAPACITY) {}

  add(chunk: string): void {
    for (const text of chunk.split("\n")) {
      if (text.trim() === "") {
        continue;
      }
      const line = { sequence: this.nextSequence, line: text };
      this.lines.push(line);
      this.nextSequence += 1;
      for (const listener of this.listeners) {
        try {
          listener(line);
        } catch {
          // A failing viewer must never break logging itself.
        }
      }
    }
    if (this.lines.length > this.capacity) {
      this.lines = this.lines.slice(-this.capacity);
    }
  }

  /** Calls `listener` for every new line until the returned function is called. */
  subscribe(listener: (line: RecentLogLine) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /** Lines after `sequence`, oldest first, at most `limit` of them. */
  after(sequence: number, limit: number): RecentLogLine[] {
    return this.lines.filter((line) => line.sequence > sequence).slice(0, limit);
  }

  /** The newest `limit` lines, oldest first. */
  tail(limit: number): RecentLogLine[] {
    return this.lines.slice(-limit);
  }

  /** Sequence of the newest line, 0 while empty. */
  latestSequence(): number {
    return this.nextSequence - 1;
  }
}

export const recentLogs = new RecentLogBuffer();

export function recentLogDestination(buffer: RecentLogBuffer = recentLogs): DestinationStream {
  return { write: (chunk: string) => buffer.add(chunk) };
}
