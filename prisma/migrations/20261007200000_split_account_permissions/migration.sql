-- Splits coarse account permissions into finer ones. Every existing grant keeps the access it
-- had: users.manage becomes the new users.* actions, registration.manage and
-- event-accounts.manage; user-groups.manage also grants user-group-members.manage; members.manage
-- also grants member-accounts.create for the same scope.

CREATE TEMP TABLE "PermissionSplit" ("old" TEXT NOT NULL, "new" TEXT NOT NULL);
INSERT INTO "PermissionSplit" ("old", "new") VALUES
  ('users.manage', 'users.create'),
  ('users.manage', 'users.edit'),
  ('users.manage', 'users.set-email'),
  ('users.manage', 'users.disable'),
  ('users.manage', 'users.sign-out'),
  ('users.manage', 'users.password-reset'),
  ('users.manage', 'users.setup-links'),
  ('users.manage', 'registration.manage'),
  ('users.manage', 'event-accounts.manage'),
  ('user-groups.manage', 'user-group-members.manage'),
  ('members.manage', 'member-accounts.create');

INSERT OR IGNORE INTO "PermissionGrant" ("id", "userGroupId", "permission", "scopeKey", "eventId", "createdAt")
SELECT lower(hex(randomblob(16))), g."userGroupId", s."new", g."scopeKey", g."eventId", g."createdAt"
FROM "PermissionGrant" g JOIN "PermissionSplit" s ON s."old" = g."permission";

INSERT OR IGNORE INTO "ApiClientPermissionGrant" ("id", "apiClientId", "permission", "scopeKey", "eventId", "createdAt")
SELECT lower(hex(randomblob(16))), g."apiClientId", s."new", g."scopeKey", g."eventId", g."createdAt"
FROM "ApiClientPermissionGrant" g JOIN "PermissionSplit" s ON s."old" = g."permission";

DELETE FROM "PermissionGrant" WHERE "permission" = 'users.manage';
DELETE FROM "ApiClientPermissionGrant" WHERE "permission" = 'users.manage';

DROP TABLE "PermissionSplit";
