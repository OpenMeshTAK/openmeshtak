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
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "MeshtasticChannel_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "MeshtasticChannelAudience" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "channelId" TEXT NOT NULL,
    "eventGroupId" TEXT,
    "eventRoleId" TEXT,
    "eventMemberId" TEXT,
    CONSTRAINT "MeshtasticChannelAudience_channelId_fkey" FOREIGN KEY ("channelId") REFERENCES "MeshtasticChannel" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "MeshtasticChannelAudience_eventGroupId_fkey" FOREIGN KEY ("eventGroupId") REFERENCES "EventGroup" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "MeshtasticChannelAudience_eventRoleId_fkey" FOREIGN KEY ("eventRoleId") REFERENCES "EventRole" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "MeshtasticChannelAudience_eventMemberId_fkey" FOREIGN KEY ("eventMemberId") REFERENCES "EventMember" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

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
