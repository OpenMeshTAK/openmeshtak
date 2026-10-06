-- CreateTable
CREATE TABLE "Event" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "timeZone" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "version" INTEGER NOT NULL DEFAULT 1,
    "startsAt" DATETIME,
    "endsAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "user" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "username" TEXT,
    "displayUsername" TEXT,
    "image" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "session" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "expiresAt" DATETIME NOT NULL,
    "token" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "userId" TEXT NOT NULL,
    CONSTRAINT "session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "passkey" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT,
    "publicKey" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "credentialID" TEXT NOT NULL,
    "counter" INTEGER NOT NULL,
    "deviceType" TEXT NOT NULL,
    "backedUp" BOOLEAN NOT NULL,
    "transports" TEXT,
    "aaguid" TEXT,
    "createdAt" DATETIME DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "passkey_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "account" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "accountId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "idToken" TEXT,
    "accessTokenExpiresAt" DATETIME,
    "refreshTokenExpiresAt" DATETIME,
    "scope" TEXT,
    "password" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "verification" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "identifier" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "DomainUser" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "displayName" TEXT NOT NULL,
    "disabledAt" DATETIME,
    "version" INTEGER NOT NULL DEFAULT 1,
    "authSubjectId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "DomainUser_authSubjectId_fkey" FOREIGN KEY ("authSubjectId") REFERENCES "user" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "UserGroup" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "systemKey" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "UserGroupMembership" (
    "userId" TEXT NOT NULL,
    "userGroupId" TEXT NOT NULL,
    "assignedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY ("userId", "userGroupId"),
    CONSTRAINT "UserGroupMembership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "DomainUser" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "UserGroupMembership_userGroupId_fkey" FOREIGN KEY ("userGroupId") REFERENCES "UserGroup" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PermissionGrant" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userGroupId" TEXT NOT NULL,
    "permission" TEXT NOT NULL,
    "scopeKey" TEXT NOT NULL,
    "eventId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PermissionGrant_userGroupId_fkey" FOREIGN KEY ("userGroupId") REFERENCES "UserGroup" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PermissionGrant_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "BootstrapChallenge" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    "consumedAt" DATETIME,
    "revokedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "ApiClient" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdByUserId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ApiClient_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "DomainUser" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ApiClientPermissionGrant" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "apiClientId" TEXT NOT NULL,
    "permission" TEXT NOT NULL,
    "scopeKey" TEXT NOT NULL,
    "eventId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ApiClientPermissionGrant_apiClientId_fkey" FOREIGN KEY ("apiClientId") REFERENCES "ApiClient" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ApiClientPermissionGrant_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ApiKey" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "apiClientId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "publicKeyId" TEXT NOT NULL,
    "secretHash" TEXT NOT NULL,
    "expiresAt" DATETIME,
    "lastUsedAt" DATETIME,
    "revokedAt" DATETIME,
    "createdByUserId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ApiKey_apiClientId_fkey" FOREIGN KEY ("apiClientId") REFERENCES "ApiClient" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
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

-- CreateTable
CREATE TABLE "EventRole" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "eventId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "takRoleOverride" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "EventRole_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "EventGroup" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "eventId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "callsignFormat" TEXT NOT NULL DEFAULT '{username}',
    "shortNamePrefix" TEXT,
    "takTeam" TEXT NOT NULL DEFAULT 'Cyan',
    "takRole" TEXT NOT NULL DEFAULT 'Team Member',
    "takServerGroups" JSONB NOT NULL DEFAULT [],
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "EventGroup_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ExternalIdentity" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "provider" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ExternalIdentity_userId_fkey" FOREIGN KEY ("userId") REFERENCES "DomainUser" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "EventMember" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "eventId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "eventRoleId" TEXT NOT NULL,
    "eventGroupId" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "username" TEXT NOT NULL,
    "callsign" TEXT NOT NULL,
    "callsignOverride" TEXT,
    "shortNameNumber" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "EventMember_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "EventMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "DomainUser" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "EventMember_eventRoleId_fkey" FOREIGN KEY ("eventRoleId") REFERENCES "EventRole" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "EventMember_eventGroupId_fkey" FOREIGN KEY ("eventGroupId") REFERENCES "EventGroup" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SyncIssue" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "eventId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'open',
    "username" TEXT NOT NULL,
    "requestedRole" TEXT NOT NULL,
    "requestedGroup" TEXT NOT NULL,
    "reasons" JSONB NOT NULL,
    "occurrences" INTEGER NOT NULL DEFAULT 1,
    "resolvedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "SyncIssue_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "MemberClaim" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "eventId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    "consumedAt" DATETIME,
    "revokedAt" DATETIME,
    "issuedByType" TEXT NOT NULL,
    "issuedById" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MemberClaim_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "MemberClaim_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "EventMember" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "EventConfigurationRevision" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "eventId" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "snapshot" JSONB NOT NULL,
    "snapshotHash" TEXT NOT NULL,
    "createdByType" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "EventConfigurationRevision_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DataPackage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "eventId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "audienceAll" BOOLEAN NOT NULL DEFAULT true,
    "installOnEnrollment" BOOLEAN NOT NULL DEFAULT false,
    "installOnConnection" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "DataPackage_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DataPackageSource" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "packageId" TEXT NOT NULL,
    "sourcePackageId" TEXT NOT NULL,
    "sourcePackageName" TEXT NOT NULL,
    "sourceRevision" INTEGER NOT NULL,
    "sourceSnapshotHash" TEXT NOT NULL,
    "sourceLayerIds" JSONB NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DataPackageSource_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "DataPackage" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PackageLayer" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "packageId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL,
    "visible" BOOLEAN NOT NULL DEFAULT true,
    "locked" BOOLEAN NOT NULL DEFAULT false,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "PackageLayer_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "DataPackage" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "StorageBlob" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "storageKey" TEXT NOT NULL,
    "sha256" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "mediaType" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "PackageContent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "packageId" TEXT NOT NULL,
    "layerId" TEXT NOT NULL,
    "blobId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "archivePath" TEXT NOT NULL,
    "metadata" JSONB,
    "visible" BOOLEAN NOT NULL DEFAULT true,
    "opacity" REAL NOT NULL DEFAULT 1,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PackageContent_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "DataPackage" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PackageContent_layerId_fkey" FOREIGN KEY ("layerId") REFERENCES "PackageLayer" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PackageContent_blobId_fkey" FOREIGN KEY ("blobId") REFERENCES "StorageBlob" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PackageObject" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "packageId" TEXT NOT NULL,
    "layerId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "geometry" JSONB NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "style" JSONB NOT NULL,
    "tak" JSONB,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "PackageObject_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "DataPackage" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PackageObject_layerId_fkey" FOREIGN KEY ("layerId") REFERENCES "PackageLayer" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PackageRevision" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "packageId" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "snapshot" JSONB NOT NULL,
    "snapshotHash" TEXT NOT NULL,
    "createdByType" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PackageRevision_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "DataPackage" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "MeshtasticChannel" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "eventId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL,
    "pskEnvelope" TEXT NOT NULL,
    "pskBytes" INTEGER NOT NULL,
    "pskVersion" INTEGER NOT NULL DEFAULT 1,
    "pskRotatedAt" DATETIME,
    "uplinkEnabled" BOOLEAN NOT NULL DEFAULT false,
    "downlinkEnabled" BOOLEAN NOT NULL DEFAULT false,
    "positionPrecision" INTEGER NOT NULL DEFAULT 0,
    "secret" BOOLEAN NOT NULL DEFAULT false,
    "releasedAt" DATETIME,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "MeshtasticChannel_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "MeshtasticChannelAudience" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "channelId" TEXT NOT NULL,
    "keyHolder" BOOLEAN NOT NULL DEFAULT false,
    "eventGroupId" TEXT,
    "eventRoleId" TEXT,
    "eventMemberId" TEXT,
    CONSTRAINT "MeshtasticChannelAudience_channelId_fkey" FOREIGN KEY ("channelId") REFERENCES "MeshtasticChannel" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "MeshtasticChannelAudience_eventGroupId_fkey" FOREIGN KEY ("eventGroupId") REFERENCES "EventGroup" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "MeshtasticChannelAudience_eventRoleId_fkey" FOREIGN KEY ("eventRoleId") REFERENCES "EventRole" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "MeshtasticChannelAudience_eventMemberId_fkey" FOREIGN KEY ("eventMemberId") REFERENCES "EventMember" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "MeshtasticConfiguration" (
    "eventId" TEXT NOT NULL PRIMARY KEY,
    "firmwareVersion" TEXT NOT NULL,
    "settings" JSONB NOT NULL,
    "secretsEnvelope" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "MeshtasticConfiguration_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DataPackageAudience" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "packageId" TEXT NOT NULL,
    "eventGroupId" TEXT,
    "eventRoleId" TEXT,
    "eventMemberId" TEXT,
    CONSTRAINT "DataPackageAudience_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "DataPackage" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "DataPackageAudience_eventGroupId_fkey" FOREIGN KEY ("eventGroupId") REFERENCES "EventGroup" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "DataPackageAudience_eventRoleId_fkey" FOREIGN KEY ("eventRoleId") REFERENCES "EventRole" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "DataPackageAudience_eventMemberId_fkey" FOREIGN KEY ("eventMemberId") REFERENCES "EventMember" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TakConfiguration" (
    "eventId" TEXT NOT NULL PRIMARY KEY,
    "mode" TEXT NOT NULL DEFAULT 'none',
    "meshChannelId" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "TakConfiguration_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TakConfiguration_meshChannelId_fkey" FOREIGN KEY ("meshChannelId") REFERENCES "MeshtasticChannel" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TakCertificateAuthority" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "origin" TEXT NOT NULL,
    "certificatePem" TEXT NOT NULL,
    "keyEnvelope" TEXT NOT NULL,
    "fingerprintSha256" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "notBefore" DATETIME NOT NULL,
    "notAfter" DATETIME NOT NULL,
    "activeSlot" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "TakServerCertificate" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "source" TEXT NOT NULL,
    "hostName" TEXT NOT NULL,
    "caId" TEXT,
    "certificateChainPem" TEXT NOT NULL,
    "keyEnvelope" TEXT NOT NULL,
    "fingerprintSha256" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "notAfter" DATETIME NOT NULL,
    "activeSlot" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "TakAcmeSettings" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "email" TEXT,
    "challengeType" TEXT NOT NULL DEFAULT 'dns-01',
    "provider" TEXT NOT NULL DEFAULT 'cloudflare',
    "cloudflareZoneId" TEXT,
    "apiTokenEnvelope" TEXT,
    "accountKeyEnvelope" TEXT,
    "lastAttemptAt" DATETIME,
    "lastSuccessAt" DATETIME,
    "lastError" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "TakServerSettings" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "hostName" TEXT,
    "enrollmentPort" INTEGER NOT NULL DEFAULT 8446,
    "martiPort" INTEGER NOT NULL DEFAULT 8443,
    "streamingPort" INTEGER NOT NULL DEFAULT 8089,
    "clientCertificateDays" INTEGER NOT NULL DEFAULT 365,
    "endpointChangedAt" DATETIME,
    "version" INTEGER NOT NULL DEFAULT 1,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "TakEnrollmentToken" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    "usedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TakEnrollmentToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "DomainUser" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TakClientCertificate" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "caId" TEXT NOT NULL,
    "serialNumber" TEXT NOT NULL,
    "fingerprintSha256" TEXT NOT NULL,
    "commonName" TEXT NOT NULL,
    "clientUid" TEXT,
    "notBefore" DATETIME NOT NULL,
    "notAfter" DATETIME NOT NULL,
    "revokedAt" DATETIME,
    "revocationReason" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TakClientCertificate_userId_fkey" FOREIGN KEY ("userId") REFERENCES "DomainUser" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "EmailSettings" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "host" TEXT,
    "port" INTEGER NOT NULL DEFAULT 587,
    "security" TEXT NOT NULL DEFAULT 'starttls',
    "username" TEXT,
    "passwordEnvelope" TEXT,
    "fromAddress" TEXT,
    "fromName" TEXT NOT NULL DEFAULT 'OpenMeshTak',
    "version" INTEGER NOT NULL DEFAULT 1,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "TakTrafficRecording" (
    "eventId" TEXT NOT NULL PRIMARY KEY,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "retentionDays" INTEGER NOT NULL DEFAULT 30,
    "version" INTEGER NOT NULL DEFAULT 1,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "TakTrafficRecording_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TakTrafficItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "eventId" TEXT NOT NULL,
    "uid" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "callsign" TEXT,
    "lat" REAL NOT NULL,
    "lon" REAL NOT NULL,
    "time" DATETIME NOT NULL,
    "stale" DATETIME NOT NULL,
    "userId" TEXT NOT NULL,
    "receivedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TakTrafficItem_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "MapSettings" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "providerName" TEXT NOT NULL,
    "tileUrlTemplate" TEXT NOT NULL,
    "attribution" TEXT NOT NULL,
    "maxZoom" INTEGER NOT NULL DEFAULT 19,
    "version" INTEGER NOT NULL DEFAULT 1,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "DownloadGrant" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tokenHash" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "eventId" TEXT,
    "memberId" TEXT,
    "packageId" TEXT,
    "expiresAt" DATETIME NOT NULL,
    "uses" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DownloadGrant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "DomainUser" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Event_slug_key" ON "Event"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "user_email_key" ON "user"("email");

-- CreateIndex
CREATE UNIQUE INDEX "user_username_key" ON "user"("username");

-- CreateIndex
CREATE UNIQUE INDEX "session_token_key" ON "session"("token");

-- CreateIndex
CREATE INDEX "session_userId_idx" ON "session"("userId");

-- CreateIndex
CREATE INDEX "passkey_userId_idx" ON "passkey"("userId");

-- CreateIndex
CREATE INDEX "passkey_credentialID_idx" ON "passkey"("credentialID");

-- CreateIndex
CREATE INDEX "account_userId_idx" ON "account"("userId");

-- CreateIndex
CREATE INDEX "verification_identifier_idx" ON "verification"("identifier");

-- CreateIndex
CREATE UNIQUE INDEX "DomainUser_authSubjectId_key" ON "DomainUser"("authSubjectId");

-- CreateIndex
CREATE UNIQUE INDEX "UserGroup_slug_key" ON "UserGroup"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "UserGroup_systemKey_key" ON "UserGroup"("systemKey");

-- CreateIndex
CREATE INDEX "UserGroupMembership_userGroupId_idx" ON "UserGroupMembership"("userGroupId");

-- CreateIndex
CREATE INDEX "PermissionGrant_eventId_idx" ON "PermissionGrant"("eventId");

-- CreateIndex
CREATE UNIQUE INDEX "PermissionGrant_userGroupId_permission_scopeKey_key" ON "PermissionGrant"("userGroupId", "permission", "scopeKey");

-- CreateIndex
CREATE UNIQUE INDEX "BootstrapChallenge_tokenHash_key" ON "BootstrapChallenge"("tokenHash");

-- CreateIndex
CREATE INDEX "BootstrapChallenge_expiresAt_idx" ON "BootstrapChallenge"("expiresAt");

-- CreateIndex
CREATE INDEX "ApiClient_createdAt_id_idx" ON "ApiClient"("createdAt", "id");

-- CreateIndex
CREATE INDEX "ApiClientPermissionGrant_eventId_idx" ON "ApiClientPermissionGrant"("eventId");

-- CreateIndex
CREATE UNIQUE INDEX "ApiClientPermissionGrant_apiClientId_permission_scopeKey_key" ON "ApiClientPermissionGrant"("apiClientId", "permission", "scopeKey");

-- CreateIndex
CREATE UNIQUE INDEX "ApiKey_publicKeyId_key" ON "ApiKey"("publicKeyId");

-- CreateIndex
CREATE INDEX "ApiKey_apiClientId_createdAt_id_idx" ON "ApiKey"("apiClientId", "createdAt", "id");

-- CreateIndex
CREATE INDEX "AuditEvent_occurredAt_id_idx" ON "AuditEvent"("occurredAt", "id");

-- CreateIndex
CREATE INDEX "AuditEvent_targetType_targetId_idx" ON "AuditEvent"("targetType", "targetId");

-- CreateIndex
CREATE INDEX "EventRole_eventId_createdAt_id_idx" ON "EventRole"("eventId", "createdAt", "id");

-- CreateIndex
CREATE UNIQUE INDEX "EventRole_eventId_slug_key" ON "EventRole"("eventId", "slug");

-- CreateIndex
CREATE INDEX "EventGroup_eventId_createdAt_id_idx" ON "EventGroup"("eventId", "createdAt", "id");

-- CreateIndex
CREATE UNIQUE INDEX "EventGroup_eventId_slug_key" ON "EventGroup"("eventId", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "EventGroup_eventId_shortNamePrefix_key" ON "EventGroup"("eventId", "shortNamePrefix");

-- CreateIndex
CREATE INDEX "ExternalIdentity_userId_idx" ON "ExternalIdentity"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "ExternalIdentity_provider_externalId_key" ON "ExternalIdentity"("provider", "externalId");

-- CreateIndex
CREATE INDEX "EventMember_eventId_createdAt_id_idx" ON "EventMember"("eventId", "createdAt", "id");

-- CreateIndex
CREATE INDEX "EventMember_eventRoleId_idx" ON "EventMember"("eventRoleId");

-- CreateIndex
CREATE UNIQUE INDEX "EventMember_eventId_userId_key" ON "EventMember"("eventId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "EventMember_eventId_callsign_key" ON "EventMember"("eventId", "callsign");

-- CreateIndex
CREATE UNIQUE INDEX "EventMember_eventGroupId_shortNameNumber_key" ON "EventMember"("eventGroupId", "shortNameNumber");

-- CreateIndex
CREATE INDEX "SyncIssue_eventId_createdAt_id_idx" ON "SyncIssue"("eventId", "createdAt", "id");

-- CreateIndex
CREATE UNIQUE INDEX "SyncIssue_eventId_provider_externalId_key" ON "SyncIssue"("eventId", "provider", "externalId");

-- CreateIndex
CREATE UNIQUE INDEX "MemberClaim_tokenHash_key" ON "MemberClaim"("tokenHash");

-- CreateIndex
CREATE INDEX "MemberClaim_memberId_idx" ON "MemberClaim"("memberId");

-- CreateIndex
CREATE INDEX "MemberClaim_eventId_idx" ON "MemberClaim"("eventId");

-- CreateIndex
CREATE INDEX "EventConfigurationRevision_eventId_createdAt_id_idx" ON "EventConfigurationRevision"("eventId", "createdAt", "id");

-- CreateIndex
CREATE UNIQUE INDEX "EventConfigurationRevision_eventId_number_key" ON "EventConfigurationRevision"("eventId", "number");

-- CreateIndex
CREATE INDEX "DataPackage_eventId_createdAt_id_idx" ON "DataPackage"("eventId", "createdAt", "id");

-- CreateIndex
CREATE INDEX "DataPackageSource_packageId_idx" ON "DataPackageSource"("packageId");

-- CreateIndex
CREATE INDEX "PackageLayer_packageId_sortOrder_idx" ON "PackageLayer"("packageId", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "StorageBlob_storageKey_key" ON "StorageBlob"("storageKey");

-- CreateIndex
CREATE INDEX "StorageBlob_sha256_idx" ON "StorageBlob"("sha256");

-- CreateIndex
CREATE INDEX "PackageContent_packageId_createdAt_id_idx" ON "PackageContent"("packageId", "createdAt", "id");

-- CreateIndex
CREATE INDEX "PackageContent_layerId_idx" ON "PackageContent"("layerId");

-- CreateIndex
CREATE INDEX "PackageContent_blobId_idx" ON "PackageContent"("blobId");

-- CreateIndex
CREATE INDEX "PackageObject_packageId_createdAt_id_idx" ON "PackageObject"("packageId", "createdAt", "id");

-- CreateIndex
CREATE INDEX "PackageObject_layerId_idx" ON "PackageObject"("layerId");

-- CreateIndex
CREATE INDEX "PackageRevision_packageId_createdAt_id_idx" ON "PackageRevision"("packageId", "createdAt", "id");

-- CreateIndex
CREATE UNIQUE INDEX "PackageRevision_packageId_number_key" ON "PackageRevision"("packageId", "number");

-- CreateIndex
CREATE INDEX "MeshtasticChannel_eventId_createdAt_id_idx" ON "MeshtasticChannel"("eventId", "createdAt", "id");

-- CreateIndex
CREATE UNIQUE INDEX "MeshtasticChannel_eventId_name_key" ON "MeshtasticChannel"("eventId", "name");

-- CreateIndex
CREATE INDEX "MeshtasticChannelAudience_channelId_idx" ON "MeshtasticChannelAudience"("channelId");

-- CreateIndex
CREATE INDEX "MeshtasticChannelAudience_eventGroupId_idx" ON "MeshtasticChannelAudience"("eventGroupId");

-- CreateIndex
CREATE INDEX "MeshtasticChannelAudience_eventRoleId_idx" ON "MeshtasticChannelAudience"("eventRoleId");

-- CreateIndex
CREATE INDEX "MeshtasticChannelAudience_eventMemberId_idx" ON "MeshtasticChannelAudience"("eventMemberId");

-- CreateIndex
CREATE INDEX "DataPackageAudience_packageId_idx" ON "DataPackageAudience"("packageId");

-- CreateIndex
CREATE INDEX "DataPackageAudience_eventGroupId_idx" ON "DataPackageAudience"("eventGroupId");

-- CreateIndex
CREATE INDEX "DataPackageAudience_eventRoleId_idx" ON "DataPackageAudience"("eventRoleId");

-- CreateIndex
CREATE INDEX "DataPackageAudience_eventMemberId_idx" ON "DataPackageAudience"("eventMemberId");

-- CreateIndex
CREATE UNIQUE INDEX "TakCertificateAuthority_fingerprintSha256_key" ON "TakCertificateAuthority"("fingerprintSha256");

-- CreateIndex
CREATE UNIQUE INDEX "TakCertificateAuthority_activeSlot_key" ON "TakCertificateAuthority"("activeSlot");

-- CreateIndex
CREATE UNIQUE INDEX "TakServerCertificate_activeSlot_key" ON "TakServerCertificate"("activeSlot");

-- CreateIndex
CREATE UNIQUE INDEX "TakEnrollmentToken_tokenHash_key" ON "TakEnrollmentToken"("tokenHash");

-- CreateIndex
CREATE INDEX "TakEnrollmentToken_userId_idx" ON "TakEnrollmentToken"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "TakClientCertificate_serialNumber_key" ON "TakClientCertificate"("serialNumber");

-- CreateIndex
CREATE UNIQUE INDEX "TakClientCertificate_fingerprintSha256_key" ON "TakClientCertificate"("fingerprintSha256");

-- CreateIndex
CREATE INDEX "TakClientCertificate_userId_idx" ON "TakClientCertificate"("userId");

-- CreateIndex
CREATE INDEX "TakTrafficItem_eventId_receivedAt_idx" ON "TakTrafficItem"("eventId", "receivedAt");

-- CreateIndex
CREATE UNIQUE INDEX "DownloadGrant_tokenHash_key" ON "DownloadGrant"("tokenHash");

-- CreateIndex
CREATE INDEX "DownloadGrant_userId_idx" ON "DownloadGrant"("userId");
