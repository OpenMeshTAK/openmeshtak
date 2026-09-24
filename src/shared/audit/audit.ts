import { randomUUID } from "node:crypto";
import type { Prisma } from "../../generated/prisma/client.js";
import type { Principal } from "../auth/principal.js";
import { database } from "../database/database.js";
import { sanitizeLogMetadata } from "../logging/sanitize.js";

type AuditClient = Pick<Prisma.TransactionClient, "auditEvent">;

export type AuditActor =
  | Principal
  /** A user authenticated without a browser session, e.g. by a TAK enrollment token or certificate. */
  | { type: "user"; id: string }
  | { type: "anonymous" }
  | { type: "system" };

export interface AuditEntry {
  actor: AuditActor;
  action: string;
  targetType: string;
  targetId?: string | null;
  result: "success" | "failure";
  traceId?: string;
  /** Safe identifiers and state names only. Secrets and their hashes never belong here. */
  metadata?: Record<string, unknown>;
}

function actorFields(actor: AuditActor): {
  actorType: "user" | "service_account" | "anonymous" | "system";
  actorId: string | null;
} {
  switch (actor.type) {
    case "user":
      return { actorType: "user", actorId: actor.id };
    case "service-account":
      return { actorType: "service_account", actorId: actor.id };
    default:
      return { actorType: actor.type, actorId: null };
  }
}

/**
 * Pass the surrounding transaction client so the audit record commits or rolls back together
 * with the change it describes.
 */
export async function recordAudit(entry: AuditEntry, client: AuditClient = database): Promise<void> {
  await client.auditEvent.create({
    data: {
      id: randomUUID(),
      ...actorFields(entry.actor),
      action: entry.action,
      targetType: entry.targetType,
      targetId: entry.targetId ?? null,
      result: entry.result,
      traceId: entry.traceId ?? null,
      // Defense in depth: the same redaction as logs, in case a caller passes an unsafe value.
      ...(entry.metadata === undefined
        ? {}
        : { metadata: sanitizeLogMetadata(entry.metadata) as Prisma.InputJsonObject }),
    },
  });
}
