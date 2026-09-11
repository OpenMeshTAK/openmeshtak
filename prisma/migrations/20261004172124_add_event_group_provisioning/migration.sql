-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_EventGroup" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "eventId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "callsignFormat" TEXT NOT NULL DEFAULT '{username}',
    "shortNamePrefix" TEXT,
    "takTeam" TEXT NOT NULL DEFAULT 'Cyan',
    "takRole" TEXT NOT NULL DEFAULT 'Team Member',
    "takServerGroups" JSONB NOT NULL DEFAULT '[]',
    "meshtasticDeviceRole" TEXT NOT NULL DEFAULT 'CLIENT',
    "meshtasticChannels" JSONB NOT NULL DEFAULT '[]',
    "missionGroups" JSONB NOT NULL DEFAULT '[]',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "EventGroup_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_EventGroup" ("createdAt", "description", "eventId", "id", "name", "slug", "updatedAt", "version") SELECT "createdAt", "description", "eventId", "id", "name", "slug", "updatedAt", "version" FROM "EventGroup";
DROP TABLE "EventGroup";
ALTER TABLE "new_EventGroup" RENAME TO "EventGroup";
CREATE INDEX "EventGroup_eventId_createdAt_id_idx" ON "EventGroup"("eventId", "createdAt", "id");
CREATE UNIQUE INDEX "EventGroup_eventId_slug_key" ON "EventGroup"("eventId", "slug");
CREATE UNIQUE INDEX "EventGroup_eventId_shortNamePrefix_key" ON "EventGroup"("eventId", "shortNamePrefix");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
