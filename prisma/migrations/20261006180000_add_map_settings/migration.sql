-- CreateTable
CREATE TABLE "MapSettings" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "providerName" TEXT NOT NULL,
    "tileUrlTemplate" TEXT NOT NULL,
    "attribution" TEXT NOT NULL,
    "maxZoom" INTEGER NOT NULL DEFAULT 19,
    "version" INTEGER NOT NULL DEFAULT 1,
    "updatedAt" DATETIME NOT NULL
);
