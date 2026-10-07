-- CreateTable
CREATE TABLE "FirmwareReleaseSettings" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "checkEnabled" BOOLEAN NOT NULL DEFAULT true,
    "version" INTEGER NOT NULL DEFAULT 1,
    "updatedAt" DATETIME NOT NULL
);
