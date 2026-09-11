-- CreateTable
CREATE TABLE "EventConfigurationRevision" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "eventId" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "snapshot" JSONB NOT NULL,
    "snapshotHash" TEXT NOT NULL,
    "createdByType" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "EventConfigurationRevision_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "EventConfigurationRevision_eventId_createdAt_id_idx" ON "EventConfigurationRevision"("eventId", "createdAt", "id");

-- CreateIndex
CREATE UNIQUE INDEX "EventConfigurationRevision_eventId_number_key" ON "EventConfigurationRevision"("eventId", "number");
