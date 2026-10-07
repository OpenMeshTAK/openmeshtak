-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_DomainUser" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "displayName" TEXT NOT NULL,
    "disabledAt" DATETIME,
    "version" INTEGER NOT NULL DEFAULT 1,
    "authSubjectId" TEXT,
    "accountEventId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "DomainUser_authSubjectId_fkey" FOREIGN KEY ("authSubjectId") REFERENCES "user" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "DomainUser_accountEventId_fkey" FOREIGN KEY ("accountEventId") REFERENCES "Event" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_DomainUser" ("authSubjectId", "createdAt", "disabledAt", "displayName", "id", "updatedAt", "version") SELECT "authSubjectId", "createdAt", "disabledAt", "displayName", "id", "updatedAt", "version" FROM "DomainUser";
DROP TABLE "DomainUser";
ALTER TABLE "new_DomainUser" RENAME TO "DomainUser";
CREATE UNIQUE INDEX "DomainUser_authSubjectId_key" ON "DomainUser"("authSubjectId");
CREATE INDEX "DomainUser_accountEventId_idx" ON "DomainUser"("accountEventId");
CREATE TABLE "new_Event" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "timeZone" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "version" INTEGER NOT NULL DEFAULT 1,
    "startsAt" DATETIME,
    "endsAt" DATETIME,
    "takLoginTokenDays" INTEGER NOT NULL DEFAULT 0,
    "permanentAccounts" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Event" ("createdAt", "endsAt", "id", "name", "slug", "startsAt", "status", "takLoginTokenDays", "timeZone", "updatedAt", "version") SELECT "createdAt", "endsAt", "id", "name", "slug", "startsAt", "status", "takLoginTokenDays", "timeZone", "updatedAt", "version" FROM "Event";
DROP TABLE "Event";
ALTER TABLE "new_Event" RENAME TO "Event";
CREATE UNIQUE INDEX "Event_slug_key" ON "Event"("slug");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
