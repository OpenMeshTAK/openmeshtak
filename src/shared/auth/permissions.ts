export const PERMISSIONS = [
  "users.read",
  "users.manage",
  "user-groups.read",
  "user-groups.manage",
  "events.read",
  "events.manage",
  "events.reactivate",
  "members.read",
  "members.manage",
  "members.sync",
  "member-claims.create",
  "channel-keys.reveal",
  "data-packages.read",
  "data-packages.edit",
  "data-packages.publish",
  "artifacts.generate",
  "artifacts.download",
  "member-artifacts.download",
  "tak-traffic.view",
  "service-accounts.manage",
  "tak-server.manage",
  "tak-server.admin-access",
  "email.manage",
  "audit.read",
] as const;

export type Permission = (typeof PERMISSIONS)[number];

/**
 * Installation-wide administration cannot be narrowed to one event. Granting these with an
 * event scope would suggest a boundary the server cannot enforce, so the API rejects it.
 */
const INSTANCE_ONLY_PERMISSIONS: ReadonlySet<Permission> = new Set<Permission>([
  "users.read",
  "users.manage",
  "user-groups.read",
  "user-groups.manage",
  "service-accounts.manage",
  "tak-server.manage",
  "tak-server.admin-access",
  "email.manage",
  "audit.read",
]);

export const INSTANCE_SCOPE_KEY = "instance";

export function isPermission(value: string): value is Permission {
  return (PERMISSIONS as readonly string[]).includes(value);
}

export function supportsEventScope(permission: Permission): boolean {
  return !INSTANCE_ONLY_PERMISSIONS.has(permission);
}

/** Grants store a single comparable scope key so uniqueness works for nullable event IDs. */
export function scopeKeyFor(eventId: string | null): string {
  return eventId === null ? INSTANCE_SCOPE_KEY : `event:${eventId}`;
}
