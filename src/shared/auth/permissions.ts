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
  "missions.read",
  "missions.edit",
  "missions.publish",
  "artifacts.generate",
  "artifacts.download",
  "service-accounts.manage",
  "audit.read",
] as const;

export type Permission = (typeof PERMISSIONS)[number];
