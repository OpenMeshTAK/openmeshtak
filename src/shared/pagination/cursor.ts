import { z } from "zod";
import { ProblemError } from "../errors/problem-error.js";

export const DEFAULT_PAGE_LIMIT = 50;

export interface PageInfo {
  nextCursor: string | null;
  hasMore: boolean;
}

export interface Page<T> {
  items: T[];
  page: PageInfo;
}

/** Position in a list sorted by `createdAt` ascending with `id` as the unique tie-breaker. */
export interface CursorPosition {
  createdAt: Date;
  id: string;
}

const cursorSchema = z.object({
  c: z.string(),
  t: z.iso.datetime(),
  i: z.string(),
});

function invalidCursor(): ProblemError {
  return new ProblemError({
    type: "urn:openmeshtak:problem:invalid-cursor",
    title: "Invalid cursor",
    status: 400,
    detail: "The pagination cursor is malformed or belongs to a different list.",
    code: "INVALID_CURSOR",
  });
}

/**
 * Cursors embed the list context so a cursor from one endpoint or filter cannot be replayed
 * against another. They are opaque to clients, not a security boundary.
 */
export function encodeCursor(context: string, position: CursorPosition): string {
  const payload = { c: context, t: position.createdAt.toISOString(), i: position.id };
  return Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
}

export function decodeCursor(context: string, cursor: string): CursorPosition {
  let payload: unknown;
  try {
    payload = JSON.parse(Buffer.from(cursor, "base64url").toString("utf8"));
  } catch {
    throw invalidCursor();
  }

  const parsed = cursorSchema.safeParse(payload);
  if (!parsed.success || parsed.data.c !== context) {
    throw invalidCursor();
  }

  return { createdAt: new Date(parsed.data.t), id: parsed.data.i };
}

/** Prisma `where` fragment selecting rows strictly after the cursor position. */
export function afterCursor(position: CursorPosition | null): object {
  if (position === null) {
    return {};
  }

  return {
    OR: [
      { createdAt: { gt: position.createdAt } },
      { createdAt: position.createdAt, id: { gt: position.id } },
    ],
  };
}

export const CURSOR_ORDER = [{ createdAt: "asc" }, { id: "asc" }] as const;

/** Callers fetch `limit + 1` rows; the extra row only signals that another page exists. */
export function toPage<TRow extends CursorPosition, TItem>(
  context: string,
  rows: TRow[],
  limit: number,
  map: (row: TRow) => TItem,
): Page<TItem> {
  const hasMore = rows.length > limit;
  const pageRows = rows.slice(0, limit);
  const last = pageRows.at(-1);

  return {
    items: pageRows.map(map),
    page: {
      hasMore,
      nextCursor: hasMore && last !== undefined ? encodeCursor(context, last) : null,
    },
  };
}
