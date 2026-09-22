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
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PackageContent_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "DataPackage" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PackageContent_layerId_fkey" FOREIGN KEY ("layerId") REFERENCES "PackageLayer" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PackageContent_blobId_fkey" FOREIGN KEY ("blobId") REFERENCES "StorageBlob" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

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
