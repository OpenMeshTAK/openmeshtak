-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_MeshtasticChannel" (
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
INSERT INTO "new_MeshtasticChannel" ("createdAt", "downlinkEnabled", "eventId", "id", "name", "positionPrecision", "pskBytes", "pskEnvelope", "pskRotatedAt", "pskVersion", "sortOrder", "updatedAt", "uplinkEnabled", "version") SELECT "createdAt", "downlinkEnabled", "eventId", "id", "name", "positionPrecision", "pskBytes", "pskEnvelope", "pskRotatedAt", "pskVersion", "sortOrder", "updatedAt", "uplinkEnabled", "version" FROM "MeshtasticChannel";
DROP TABLE "MeshtasticChannel";
ALTER TABLE "new_MeshtasticChannel" RENAME TO "MeshtasticChannel";
CREATE INDEX "MeshtasticChannel_eventId_createdAt_id_idx" ON "MeshtasticChannel"("eventId", "createdAt", "id");
CREATE UNIQUE INDEX "MeshtasticChannel_eventId_name_key" ON "MeshtasticChannel"("eventId", "name");
CREATE TABLE "new_MeshtasticChannelAudience" (
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
INSERT INTO "new_MeshtasticChannelAudience" ("channelId", "eventGroupId", "eventMemberId", "eventRoleId", "id") SELECT "channelId", "eventGroupId", "eventMemberId", "eventRoleId", "id" FROM "MeshtasticChannelAudience";
DROP TABLE "MeshtasticChannelAudience";
ALTER TABLE "new_MeshtasticChannelAudience" RENAME TO "MeshtasticChannelAudience";
CREATE INDEX "MeshtasticChannelAudience_channelId_idx" ON "MeshtasticChannelAudience"("channelId");
CREATE INDEX "MeshtasticChannelAudience_eventGroupId_idx" ON "MeshtasticChannelAudience"("eventGroupId");
CREATE INDEX "MeshtasticChannelAudience_eventRoleId_idx" ON "MeshtasticChannelAudience"("eventRoleId");
CREATE INDEX "MeshtasticChannelAudience_eventMemberId_idx" ON "MeshtasticChannelAudience"("eventMemberId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
