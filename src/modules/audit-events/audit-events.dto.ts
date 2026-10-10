import type { Uuid } from "../../shared/http/uuid.js";
import type { PageInfo } from "../../shared/pagination/cursor.js";

export type AuditActorType = "user" | "api_client" | "anonymous" | "system";

export type AuditResult = "success" | "failure";

/** `instance`: only entries that belong to no event, such as user or TAK server administration. */
export type AuditScope = "all" | "instance";

export interface AuditActorDto {
  type: AuditActorType;
  id: string | null;
  /** Display name of the user or API client; null when it no longer exists or there is none. */
  name: string | null;
}

export interface AuditEventDto {
  id: Uuid;
  /** ISO 8601 time the action happened. */
  occurredAt: string;
  actor: AuditActorDto;
  /** Dotted action name such as `event.updated` or `tak-server.client-certificate-issued`. */
  action: string;
  targetType: string;
  targetId: string | null;
  result: AuditResult;
  /** Event the action belongs to; null for installation-wide actions. */
  eventId: Uuid | null;
  /** Current name of that event. */
  eventName: string | null;
  /** Correlates the entry with the server log lines of the same request. */
  traceId: string | null;
  /** Safe identifiers and state names recorded with the action. Never contains secrets. */
  metadata: { [key: string]: unknown } | null;
}

export interface AuditEventPage {
  items: AuditEventDto[];
  page: PageInfo;
}
