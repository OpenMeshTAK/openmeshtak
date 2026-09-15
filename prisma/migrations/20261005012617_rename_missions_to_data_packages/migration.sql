/*
  Warnings:

  - You are about to drop the `MissionLayer` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `MissionObject` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `MissionProject` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `MissionRevision` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "MissionLayer";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "MissionObject";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "MissionProject";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "MissionRevision";
PRAGMA foreign_keys=on;

-- CreateTable
CREATE TABLE "DataPackage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "eventId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "DataPackage_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event" ("id") ON DELETE CASCADE ON UPDATE CASCADE
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
CREATE TABLE "PackageObject" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "packageId" TEXT NOT NULL,
    "layerId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "geometry" JSONB NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "style" JSONB NOT NULL,
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

-- CreateIndex
CREATE INDEX "DataPackage_eventId_createdAt_id_idx" ON "DataPackage"("eventId", "createdAt", "id");

-- CreateIndex
CREATE INDEX "PackageLayer_packageId_sortOrder_idx" ON "PackageLayer"("packageId", "sortOrder");

-- CreateIndex
CREATE INDEX "PackageObject_packageId_createdAt_id_idx" ON "PackageObject"("packageId", "createdAt", "id");

-- CreateIndex
CREATE INDEX "PackageObject_layerId_idx" ON "PackageObject"("layerId");

-- CreateIndex
CREATE INDEX "PackageRevision_packageId_createdAt_id_idx" ON "PackageRevision"("packageId", "createdAt", "id");

-- CreateIndex
CREATE UNIQUE INDEX "PackageRevision_packageId_number_key" ON "PackageRevision"("packageId", "number");

-- Permissions were renamed from missions.* to data-packages.* (decided 2026-10-05).
UPDATE "PermissionGrant" SET "permission" = 'data-packages.' || substr("permission", 10) WHERE "permission" LIKE 'missions.%';
UPDATE "ServiceAccountPermissionGrant" SET "permission" = 'data-packages.' || substr("permission", 10) WHERE "permission" LIKE 'missions.%';
