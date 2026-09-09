-- CreateTable
CREATE TABLE "ServiceAccount" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdByUserId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ServiceAccount_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "DomainUser" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ServiceAccountPermissionGrant" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "serviceAccountId" TEXT NOT NULL,
    "permission" TEXT NOT NULL,
    "scopeKey" TEXT NOT NULL,
    "eventId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ServiceAccountPermissionGrant_serviceAccountId_fkey" FOREIGN KEY ("serviceAccountId") REFERENCES "ServiceAccount" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ServiceAccountPermissionGrant_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ApiKey" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "serviceAccountId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "publicKeyId" TEXT NOT NULL,
    "secretHash" TEXT NOT NULL,
    "expiresAt" DATETIME,
    "lastUsedAt" DATETIME,
    "revokedAt" DATETIME,
    "createdByUserId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ApiKey_serviceAccountId_fkey" FOREIGN KEY ("serviceAccountId") REFERENCES "ServiceAccount" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ApiKey_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "DomainUser" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AuditEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "occurredAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actorType" TEXT NOT NULL,
    "actorId" TEXT,
    "action" TEXT NOT NULL,
    "targetType" TEXT NOT NULL,
    "targetId" TEXT,
    "result" TEXT NOT NULL,
    "traceId" TEXT,
    "metadata" JSONB
);

-- CreateIndex
CREATE INDEX "ServiceAccount_createdAt_id_idx" ON "ServiceAccount"("createdAt", "id");

-- CreateIndex
CREATE INDEX "ServiceAccountPermissionGrant_eventId_idx" ON "ServiceAccountPermissionGrant"("eventId");

-- CreateIndex
CREATE UNIQUE INDEX "ServiceAccountPermissionGrant_serviceAccountId_permission_scopeKey_key" ON "ServiceAccountPermissionGrant"("serviceAccountId", "permission", "scopeKey");

-- CreateIndex
CREATE UNIQUE INDEX "ApiKey_publicKeyId_key" ON "ApiKey"("publicKeyId");

-- CreateIndex
CREATE INDEX "ApiKey_serviceAccountId_createdAt_id_idx" ON "ApiKey"("serviceAccountId", "createdAt", "id");

-- CreateIndex
CREATE INDEX "AuditEvent_occurredAt_id_idx" ON "AuditEvent"("occurredAt", "id");

-- CreateIndex
CREATE INDEX "AuditEvent_targetType_targetId_idx" ON "AuditEvent"("targetType", "targetId");
