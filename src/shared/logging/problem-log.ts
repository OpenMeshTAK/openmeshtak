import { appendFileSync, mkdirSync, readFileSync, renameSync, statSync } from "node:fs";
import { dirname, resolve } from "node:path";
import type { DestinationStream } from "pino";
import { config } from "../config/config.js";

/** Pino level numbers: 40 warn, 50 error, 60 fatal. */
const WARN_LEVEL = 40;
/** The current file rolls over to `.1` at this size, so both together stay below 10 MB. */
const MAX_FILE_BYTES = 5 * 1024 * 1024;

export const problemLogPath = resolve(config.dataDirectory, "logs", "problems.jsonl");

function levelOf(line: string): number {
  // Pino writes `"level":<n>` near the start of every line; parsing every line would cost more.
  const match = /"level":(\d+)/.exec(line);
  return match?.[1] === undefined ? 0 : Number(match[1]);
}

/**
 * Warnings and errors kept on disk so they survive a restart or crash. Lines arrive after the
 * sanitizer and redaction, exactly as on stdout. Writes are synchronous so the last line before a
 * crash is not lost; only warnings and errors are written, so this stays cheap. The file lives
 * outside the database on purpose: a failing database must still leave a trace.
 */
export class ProblemLog {
  constructor(
    private readonly path: string = problemLogPath,
    private readonly maxBytes = MAX_FILE_BYTES,
  ) {}

  write(chunk: string): void {
    const lines = chunk.split("\n").filter((line) => line.trim() !== "" && levelOf(line) >= WARN_LEVEL);
    if (lines.length === 0) {
      return;
    }
    try {
      mkdirSync(dirname(this.path), { recursive: true, mode: 0o700 });
      if (this.size() >= this.maxBytes) {
        renameSync(this.path, `${this.path}.1`);
      }
      appendFileSync(this.path, `${lines.join("\n")}\n`, { mode: 0o600 });
    } catch {
      // A full or read-only disk must never break logging itself; stdout still has the line.
    }
  }

  /** Stored lines, oldest first: the rolled-over file, then the current one. */
  read(): string[] {
    return [`${this.path}.1`, this.path].flatMap((path) => {
      try {
        return readFileSync(path, "utf8").split("\n").filter((line) => line.trim() !== "");
      } catch {
        return [];
      }
    });
  }

  private size(): number {
    try {
      return statSync(this.path).size;
    } catch {
      return 0;
    }
  }
}

export const problemLog = new ProblemLog();

export function problemLogDestination(log: ProblemLog = problemLog): DestinationStream {
  return { write: (chunk: string) => log.write(chunk) };
}
