-- AlterTable
ALTER TABLE "DataPackage" ADD COLUMN "kind" TEXT NOT NULL DEFAULT 'package';

-- CreateTable
CREATE TABLE "DataPackageWriter" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "packageId" TEXT NOT NULL,
    "eventGroupId" TEXT,
    "eventRoleId" TEXT,
    "eventMemberId" TEXT,
    CONSTRAINT "DataPackageWriter_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "DataPackage" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "DataPackageWriter_eventGroupId_fkey" FOREIGN KEY ("eventGroupId") REFERENCES "EventGroup" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "DataPackageWriter_eventRoleId_fkey" FOREIGN KEY ("eventRoleId") REFERENCES "EventRole" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "DataPackageWriter_eventMemberId_fkey" FOREIGN KEY ("eventMemberId") REFERENCES "EventMember" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "DataPackageWriter_packageId_idx" ON "DataPackageWriter"("packageId");

-- CreateIndex
CREATE INDEX "DataPackageWriter_eventGroupId_idx" ON "DataPackageWriter"("eventGroupId");

-- CreateIndex
CREATE INDEX "DataPackageWriter_eventRoleId_idx" ON "DataPackageWriter"("eventRoleId");

-- CreateIndex
CREATE INDEX "DataPackageWriter_eventMemberId_idx" ON "DataPackageWriter"("eventMemberId");
