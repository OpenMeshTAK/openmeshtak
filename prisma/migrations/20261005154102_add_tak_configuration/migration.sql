-- CreateTable
CREATE TABLE "TakConfiguration" (
    "eventId" TEXT NOT NULL PRIMARY KEY,
    "mode" TEXT NOT NULL DEFAULT 'none',
    "meshChannelId" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "TakConfiguration_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TakConfiguration_meshChannelId_fkey" FOREIGN KEY ("meshChannelId") REFERENCES "MeshtasticChannel" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
