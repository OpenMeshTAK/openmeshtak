-- Gives newer features their own permissions. Every existing grant keeps the access it had:
-- events.manage also grants the event configuration, TAK history recording/deletion permissions
-- for the same scope; tak-traffic.view also grants history and export; the data package
-- permissions also grant the mission permissions and offline snapshots. The instance-only preset
-- library follows events.manage: reading for any holder, changing for instance-wide holders.

CREATE TEMP TABLE "PermissionSplit" ("old" TEXT NOT NULL, "new" TEXT NOT NULL);
INSERT INTO "PermissionSplit" ("old", "new") VALUES
  ('events.manage', 'configuration.publish'),
  ('events.manage', 'event-groups.manage'),
  ('events.manage', 'event-roles.manage'),
  ('events.manage', 'tak-settings.manage'),
  ('events.manage', 'tak-groups.manage'),
  ('events.manage', 'meshtastic-settings.manage'),
  ('events.manage', 'meshtastic-channels.manage'),
  ('events.manage', 'tak-traffic.delete'),
  ('events.manage', 'tak-traffic.recording'),
  ('tak-traffic.view', 'tak-traffic.history'),
  ('tak-traffic.view', 'tak-traffic.export'),
  ('data-packages.read', 'missions.read'),
  ('data-packages.read', 'offline-snapshots.prepare'),
  ('data-packages.edit', 'missions.edit'),
  ('data-packages.publish', 'missions.publish');

INSERT OR IGNORE INTO "PermissionGrant" ("id", "userGroupId", "permission", "scopeKey", "eventId", "createdAt")
SELECT lower(hex(randomblob(16))), g."userGroupId", s."new", g."scopeKey", g."eventId", g."createdAt"
FROM "PermissionGrant" g JOIN "PermissionSplit" s ON s."old" = g."permission";

INSERT OR IGNORE INTO "ApiClientPermissionGrant" ("id", "apiClientId", "permission", "scopeKey", "eventId", "createdAt")
SELECT lower(hex(randomblob(16))), g."apiClientId", s."new", g."scopeKey", g."eventId", g."createdAt"
FROM "ApiClientPermissionGrant" g JOIN "PermissionSplit" s ON s."old" = g."permission";

DROP TABLE "PermissionSplit";

INSERT OR IGNORE INTO "PermissionGrant" ("id", "userGroupId", "permission", "scopeKey", "eventId", "createdAt")
SELECT lower(hex(randomblob(16))), "userGroupId", 'presets.read', 'instance', NULL, MIN("createdAt")
FROM "PermissionGrant" WHERE "permission" = 'events.manage' GROUP BY "userGroupId";

INSERT OR IGNORE INTO "ApiClientPermissionGrant" ("id", "apiClientId", "permission", "scopeKey", "eventId", "createdAt")
SELECT lower(hex(randomblob(16))), "apiClientId", 'presets.read', 'instance', NULL, MIN("createdAt")
FROM "ApiClientPermissionGrant" WHERE "permission" = 'events.manage' GROUP BY "apiClientId";

INSERT OR IGNORE INTO "PermissionGrant" ("id", "userGroupId", "permission", "scopeKey", "eventId", "createdAt")
SELECT lower(hex(randomblob(16))), "userGroupId", 'presets.manage', 'instance', NULL, "createdAt"
FROM "PermissionGrant" WHERE "permission" = 'events.manage' AND "scopeKey" = 'instance';

INSERT OR IGNORE INTO "ApiClientPermissionGrant" ("id", "apiClientId", "permission", "scopeKey", "eventId", "createdAt")
SELECT lower(hex(randomblob(16))), "apiClientId", 'presets.manage', 'instance', NULL, "createdAt"
FROM "ApiClientPermissionGrant" WHERE "permission" = 'events.manage' AND "scopeKey" = 'instance';
