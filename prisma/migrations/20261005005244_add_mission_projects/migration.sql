-- CreateTable
CREATE TABLE "MissionProject" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "eventId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "MissionProject_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "MissionLayer" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "missionId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL,
    "visible" BOOLEAN NOT NULL DEFAULT true,
    "locked" BOOLEAN NOT NULL DEFAULT false,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "MissionLayer_missionId_fkey" FOREIGN KEY ("missionId") REFERENCES "MissionProject" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "MissionObject" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "missionId" TEXT NOT NULL,
    "layerId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "geometry" JSONB NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "style" JSONB NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "MissionObject_missionId_fkey" FOREIGN KEY ("missionId") REFERENCES "MissionProject" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "MissionObject_layerId_fkey" FOREIGN KEY ("layerId") REFERENCES "MissionLayer" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "MissionRevision" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "missionId" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "snapshot" JSONB NOT NULL,
    "snapshotHash" TEXT NOT NULL,
    "createdByType" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MissionRevision_missionId_fkey" FOREIGN KEY ("missionId") REFERENCES "MissionProject" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "MissionProject_eventId_createdAt_id_idx" ON "MissionProject"("eventId", "createdAt", "id");

-- CreateIndex
CREATE INDEX "MissionLayer_missionId_sortOrder_idx" ON "MissionLayer"("missionId", "sortOrder");

-- CreateIndex
CREATE INDEX "MissionObject_missionId_createdAt_id_idx" ON "MissionObject"("missionId", "createdAt", "id");

-- CreateIndex
CREATE INDEX "MissionObject_layerId_idx" ON "MissionObject"("layerId");

-- CreateIndex
CREATE INDEX "MissionRevision_missionId_createdAt_id_idx" ON "MissionRevision"("missionId", "createdAt", "id");

-- CreateIndex
CREATE UNIQUE INDEX "MissionRevision_missionId_number_key" ON "MissionRevision"("missionId", "number");
