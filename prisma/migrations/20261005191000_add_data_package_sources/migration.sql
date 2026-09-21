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

-- CreateIndex
CREATE INDEX "DataPackageSource_packageId_idx" ON "DataPackageSource"("packageId");
