CREATE TABLE "IconSettings" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "blobId" TEXT,
    "icons" JSONB NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "IconSettings_blobId_fkey" FOREIGN KEY ("blobId") REFERENCES "StorageBlob" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX "IconSettings_blobId_idx" ON "IconSettings"("blobId");
