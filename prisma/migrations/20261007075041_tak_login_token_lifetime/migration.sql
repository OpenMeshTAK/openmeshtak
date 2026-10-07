-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
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
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Event" ("createdAt", "endsAt", "id", "name", "slug", "startsAt", "status", "timeZone", "updatedAt", "version") SELECT "createdAt", "endsAt", "id", "name", "slug", "startsAt", "status", "timeZone", "updatedAt", "version" FROM "Event";
DROP TABLE "Event";
ALTER TABLE "new_Event" RENAME TO "Event";
CREATE UNIQUE INDEX "Event_slug_key" ON "Event"("slug");
CREATE TABLE "new_TakEnrollmentToken" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" DATETIME,
    "usedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TakEnrollmentToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "DomainUser" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_TakEnrollmentToken" ("createdAt", "expiresAt", "id", "tokenHash", "usedAt", "userId") SELECT "createdAt", "expiresAt", "id", "tokenHash", "usedAt", "userId" FROM "TakEnrollmentToken";
DROP TABLE "TakEnrollmentToken";
ALTER TABLE "new_TakEnrollmentToken" RENAME TO "TakEnrollmentToken";
CREATE UNIQUE INDEX "TakEnrollmentToken_tokenHash_key" ON "TakEnrollmentToken"("tokenHash");
CREATE INDEX "TakEnrollmentToken_userId_idx" ON "TakEnrollmentToken"("userId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
