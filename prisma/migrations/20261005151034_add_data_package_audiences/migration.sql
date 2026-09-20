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

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_DataPackage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "eventId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "audienceAll" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "DataPackage_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_DataPackage" ("createdAt", "description", "eventId", "id", "name", "updatedAt", "version") SELECT "createdAt", "description", "eventId", "id", "name", "updatedAt", "version" FROM "DataPackage";
DROP TABLE "DataPackage";
ALTER TABLE "new_DataPackage" RENAME TO "DataPackage";
CREATE INDEX "DataPackage_eventId_createdAt_id_idx" ON "DataPackage"("eventId", "createdAt", "id");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "DataPackageAudience_packageId_idx" ON "DataPackageAudience"("packageId");

-- CreateIndex
CREATE INDEX "DataPackageAudience_eventGroupId_idx" ON "DataPackageAudience"("eventGroupId");

-- CreateIndex
CREATE INDEX "DataPackageAudience_eventRoleId_idx" ON "DataPackageAudience"("eventRoleId");

-- CreateIndex
CREATE INDEX "DataPackageAudience_eventMemberId_idx" ON "DataPackageAudience"("eventMemberId");
