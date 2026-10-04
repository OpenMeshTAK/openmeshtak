-- Service accounts are now called API clients. Tables and columns are renamed in place so every
-- client, grant and API key survives; stored names and audit values follow the new terms.

-- RenameTables
ALTER TABLE "ServiceAccount" RENAME TO "ApiClient";
ALTER TABLE "ServiceAccountPermissionGrant" RENAME TO "ApiClientPermissionGrant";

-- RenameColumns
ALTER TABLE "ApiClientPermissionGrant" RENAME COLUMN "serviceAccountId" TO "apiClientId";
ALTER TABLE "ApiKey" RENAME COLUMN "serviceAccountId" TO "apiClientId";

-- RenameIndexes
DROP INDEX "ServiceAccount_createdAt_id_idx";
CREATE INDEX "ApiClient_createdAt_id_idx" ON "ApiClient"("createdAt", "id");
DROP INDEX "ServiceAccountPermissionGrant_eventId_idx";
CREATE INDEX "ApiClientPermissionGrant_eventId_idx" ON "ApiClientPermissionGrant"("eventId");
DROP INDEX "ServiceAccountPermissionGrant_serviceAccountId_permission_scopeKey_key";
CREATE UNIQUE INDEX "ApiClientPermissionGrant_apiClientId_permission_scopeKey_key" ON "ApiClientPermissionGrant"("apiClientId", "permission", "scopeKey");
DROP INDEX "ApiKey_serviceAccountId_createdAt_id_idx";
CREATE INDEX "ApiKey_apiClientId_createdAt_id_idx" ON "ApiKey"("apiClientId", "createdAt", "id");

-- RenamePermission
-- Core may already have granted the new name at startup; keep one grant per group and scope.
DELETE FROM "PermissionGrant"
WHERE "permission" = 'service-accounts.manage'
  AND EXISTS (
    SELECT 1 FROM "PermissionGrant" AS "renamed"
    WHERE "renamed"."userGroupId" = "PermissionGrant"."userGroupId"
      AND "renamed"."scopeKey" = "PermissionGrant"."scopeKey"
      AND "renamed"."permission" = 'api-clients.manage'
  );
UPDATE "PermissionGrant" SET "permission" = 'api-clients.manage' WHERE "permission" = 'service-accounts.manage';
DELETE FROM "ApiClientPermissionGrant"
WHERE "permission" = 'service-accounts.manage'
  AND EXISTS (
    SELECT 1 FROM "ApiClientPermissionGrant" AS "renamed"
    WHERE "renamed"."apiClientId" = "ApiClientPermissionGrant"."apiClientId"
      AND "renamed"."scopeKey" = "ApiClientPermissionGrant"."scopeKey"
      AND "renamed"."permission" = 'api-clients.manage'
  );
UPDATE "ApiClientPermissionGrant" SET "permission" = 'api-clients.manage' WHERE "permission" = 'service-accounts.manage';

-- RenameStoredActorValues
UPDATE "AuditEvent" SET "actorType" = 'api_client' WHERE "actorType" = 'service_account';
UPDATE "AuditEvent" SET "targetType" = 'api-client' WHERE "targetType" = 'service-account';
UPDATE "AuditEvent" SET "action" = 'api-client.' || substr("action", 17) WHERE "action" LIKE 'service-account.%';
UPDATE "MemberClaim" SET "issuedByType" = 'api-client' WHERE "issuedByType" = 'service-account';
