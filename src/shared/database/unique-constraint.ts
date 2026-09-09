import { Prisma } from "../../generated/prisma/client.js";

/** Prisma reports a violated unique index as `P2002`; callers map it to a domain conflict. */
export function isUniqueConstraintError(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
}
