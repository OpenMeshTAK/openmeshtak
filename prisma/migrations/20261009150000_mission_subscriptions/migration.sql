-- CreateTable
CREATE TABLE "MissionSubscription" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "packageId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "clientUid" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MissionSubscription_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "DataPackage" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "MissionSubscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "DomainUser" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "MissionSubscription_packageId_clientUid_key" ON "MissionSubscription"("packageId", "clientUid");

-- CreateIndex
CREATE INDEX "MissionSubscription_clientUid_idx" ON "MissionSubscription"("clientUid");
