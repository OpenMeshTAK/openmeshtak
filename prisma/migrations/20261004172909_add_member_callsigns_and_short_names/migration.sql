/*
  Warnings:

  - Added the required column `callsign` to the `EventMember` table without a default value. This is not possible if the table is not empty.
  - Added the required column `shortNameNumber` to the `EventMember` table without a default value. This is not possible if the table is not empty.
  - Added the required column `username` to the `EventMember` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_EventMember" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "eventId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "eventRoleId" TEXT NOT NULL,
    "eventGroupId" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "username" TEXT NOT NULL,
    "callsign" TEXT NOT NULL,
    "callsignOverride" TEXT,
    "shortNameNumber" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "EventMember_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "EventMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "DomainUser" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "EventMember_eventRoleId_fkey" FOREIGN KEY ("eventRoleId") REFERENCES "EventRole" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "EventMember_eventGroupId_fkey" FOREIGN KEY ("eventGroupId") REFERENCES "EventGroup" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_EventMember" ("createdAt", "eventGroupId", "eventId", "eventRoleId", "id", "updatedAt", "userId", "version") SELECT "createdAt", "eventGroupId", "eventId", "eventRoleId", "id", "updatedAt", "userId", "version" FROM "EventMember";
DROP TABLE "EventMember";
ALTER TABLE "new_EventMember" RENAME TO "EventMember";
CREATE INDEX "EventMember_eventId_createdAt_id_idx" ON "EventMember"("eventId", "createdAt", "id");
CREATE INDEX "EventMember_eventRoleId_idx" ON "EventMember"("eventRoleId");
CREATE UNIQUE INDEX "EventMember_eventId_userId_key" ON "EventMember"("eventId", "userId");
CREATE UNIQUE INDEX "EventMember_eventId_callsign_key" ON "EventMember"("eventId", "callsign");
CREATE UNIQUE INDEX "EventMember_eventGroupId_shortNameNumber_key" ON "EventMember"("eventGroupId", "shortNameNumber");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
